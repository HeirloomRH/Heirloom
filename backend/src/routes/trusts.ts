import { Router, Request, Response } from "express";
import { query, pool } from "../db/index.js";
import {
  getVaultAddress,
  getVaultLiveBalances,
  encryptText,
  decryptText,
  verifyHeartbeatSignature,
  executeVaultPayout,
} from "../services/vaultService.js";
import {
  isValidEvmAddress,
  resolveRobinhoodToken,
  ALL_ROBINHOOD_TOKENS,
  formatTokenUnits,
  parseTokenUnits,
  rhcClient,
} from "../lib/robinhoodTokens.js";
import crypto from "node:crypto";
import { config } from "../config.js";
import { getAddress, isAddress } from "viem";
import {
  getRelayerInfo,
  executeSealedBasketDeposit,
  type SealedDepositPayload,
} from "../services/sealedDepositService.js";
import { buildStartLink } from "../lib/telegram.js";
import { sendCheckinConfirmation } from "../services/telegramAlertService.js";
import { parseUnits } from "viem";
import {
  getStakedPosition,
  getMinPosition,
  executeStake,
  executeUnstake,
} from "../services/orbioStakeService.js";
import { computeRolloverInfo } from "../services/inferenceLegService.js";

export const trustsRouter = Router();

/**
 * GET /api/trusts
 * List recent trusts across Robinhood Chain
 */
trustsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await query(
      `SELECT id, name, grantor_address, beneficiary_address, vault_index, vault_address,
              status, is_revocable, corpus_funded, heartbeat_window_seconds,
              last_heartbeat_at, heartbeat_deadline, created_at
       FROM trusts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      count: result.rows.length,
      trusts: result.rows,
    });
  } catch (err: any) {
    console.error("Error listing trusts:", err);
    res.status(500).json({ error: "Failed to list trusts", details: err.message });
  }
});

/**
 * POST /api/trusts
 * Create a new trust and allocate a dedicated vault address
 */
trustsRouter.post("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      name,
      grantorAddress,
      beneficiaryAddress,
      isRevocable = true,
      heartbeatWindowSeconds = 2592000, // 30 days default
      letterToBeneficiary,
      guardians = [],
      assets = [],
      vestingSchedules = [],
      mode = "public",
      termsHash,
      cipherTerms,
      cipherLetter,
    } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Trust name is required" });
      return;
    }
    if (!isValidEvmAddress(grantorAddress)) {
      res.status(400).json({ error: "Valid grantorAddress is required" });
      return;
    }
    if (!isValidEvmAddress(beneficiaryAddress)) {
      res.status(400).json({ error: "Valid beneficiaryAddress is required" });
      return;
    }

    const cleanGrantor = getAddress(grantorAddress);
    const cleanBeneficiary = getAddress(beneficiaryAddress);

    await client.query("BEGIN");

    // 1. Allocate next vault index
    const seqRes = await client.query("SELECT nextval('vault_index_seq') as next_idx");
    const vaultIndex = parseInt(seqRes.rows[0].next_idx, 10);
    const vaultAddress = getVaultAddress(vaultIndex);

    // 2. Encrypt letter if provided
    const encryptedLetter = cipherLetter || (letterToBeneficiary ? encryptText(letterToBeneficiary) : null);

    // 3. Compute initial deadline
    const windowSecs = Math.max(300, parseInt(heartbeatWindowSeconds, 10) || 2592000); // minimum 5 mins
    const initialDeadline = new Date(Date.now() + windowSecs * 1000);

    const insertTrustRes = await client.query(
      `INSERT INTO trusts (
        name, grantor_address, beneficiary_address, vault_index, vault_address,
        is_revocable, status, heartbeat_window_seconds, last_heartbeat_at,
        heartbeat_deadline, encrypted_letter, terms_json, mode, terms_hash, cipher_terms, cipher_letter
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'pending_funding', $7, NOW(),
        $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id, created_at, status, heartbeat_deadline`,
      [
        name.trim(),
        cleanGrantor,
        cleanBeneficiary,
        vaultIndex,
        vaultAddress,
        isRevocable,
        windowSecs,
        initialDeadline,
        encryptedLetter,
        JSON.stringify({
          guardiansCount: guardians.length,
          assetsCount: assets.length,
          vestingStepsCount: vestingSchedules.length,
        }),
        mode,
        termsHash || null,
        cipherTerms || null,
        encryptedLetter,
      ]
    );

    const trustId = insertTrustRes.rows[0].id;
    const createdAt = insertTrustRes.rows[0].created_at;

    // 4. Insert assets
    for (const asset of assets) {
      const resolved = resolveRobinhoodToken(asset.symbol || asset.address);
      if (resolved) {
        await client.query(
          `INSERT INTO trust_assets (trust_id, token_address, symbol, target_allocation_bps, drip_enabled)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            trustId,
            resolved.address,
            resolved.symbol,
            parseInt(asset.targetAllocationBps, 10) || 0,
            Boolean(asset.dripEnabled),
          ]
        );
      }
    }

    // 5. Insert vesting schedules
    for (const schedule of vestingSchedules) {
      const unlockTime = new Date(schedule.unlockTimestamp);
      await client.query(
        `INSERT INTO trust_vesting_schedules (trust_id, unlock_timestamp, percentage_bps, claimed)
         VALUES ($1, $2, $3, FALSE)`,
        [trustId, unlockTime, parseInt(schedule.percentageBps, 10) || 0]
      );
    }

    // 6. Insert guardians
    for (const guardian of guardians) {
      if (isValidEvmAddress(guardian.address)) {
        await client.query(
          `INSERT INTO trust_guardians (trust_id, guardian_address, role)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [trustId, getAddress(guardian.address), guardian.role || "guardian"]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      trust: {
        id: trustId,
        name: name.trim(),
        grantorAddress: cleanGrantor,
        beneficiaryAddress: cleanBeneficiary,
        vaultIndex,
        vaultAddress,
        status: "pending_funding",
        isRevocable,
        heartbeatWindowSeconds: windowSecs,
        heartbeatDeadline: initialDeadline,
        createdAt,
      },
      fundingInstructions: {
        depositAddress: vaultAddress,
        network: "Robinhood Chain",
        chainId: config.rhcId,
        acceptedTokens: ALL_ROBINHOOD_TOKENS.map((t) => ({
          symbol: t.symbol,
          name: t.name,
          address: t.address,
        })),
        note: "Transfer tokenized stocks or USDG directly to this dedicated vault address to activate the trust.",
      },
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error creating trust:", err);
    res.status(500).json({ error: "Failed to create trust", details: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/trusts/relayer-info
 * Returns public relayer discovery information and addresses
 */
trustsRouter.get("/relayer-info", (_req: Request, res: Response) => {
  res.json(getRelayerInfo());
});

/**
 * GET /api/trusts/:id
 * Retrieve trust details, live vault balances, schedules, and dead-man's switch status
 */
trustsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];

    // Fetch related records
    const [assetsRes, schedulesRes, guardiansRes, claimsRes] = await Promise.all([
      query("SELECT * FROM trust_assets WHERE trust_id = $1 ORDER BY created_at ASC", [id]),
      query("SELECT * FROM trust_vesting_schedules WHERE trust_id = $1 ORDER BY unlock_timestamp ASC", [id]),
      query("SELECT * FROM trust_guardians WHERE trust_id = $1 ORDER BY added_at ASC", [id]),
      query("SELECT * FROM vesting_claims WHERE trust_id = $1 ORDER BY created_at DESC", [id]),
    ]);

    // Live on-chain balances for this vault address
    let liveBalances: any[] = [];
    if (trust.vault_index !== null && trust.vault_index !== undefined) {
      try {
        const liveData = await getVaultLiveBalances(trust.vault_index);
        liveBalances = liveData.balances;
      } catch (e) {
        console.warn("Could not fetch live vault balances:", e);
      }
    }

    // Check dead-man's switch & 28-day safety grace period status
    const now = new Date();
    const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
    const graceDeadline = trust.grace_period_deadline
      ? new Date(trust.grace_period_deadline)
      : deadline
        ? new Date(deadline.getTime() + 28 * 86400 * 1000)
        : null;

    let computedStatus = trust.status;
    if (trust.status === "active" && deadline && now > deadline) {
      if (graceDeadline && now > graceDeadline) {
        computedStatus = "succession_triggered";
      } else {
        computedStatus = "in_grace_period";
      }
    } else if (trust.status === "in_grace_period" && graceDeadline && now > graceDeadline) {
      computedStatus = "succession_triggered";
    }

    res.json({
      trust: {
        id: trust.id,
        name: trust.name,
        grantorAddress: trust.grantor_address,
        beneficiaryAddress: trust.beneficiary_address,
        vaultIndex: trust.vault_index,
        vaultAddress: trust.vault_address,
        status: computedStatus,
        isRevocable: trust.is_revocable,
        corpusFunded: trust.corpus_funded,
        depositTxHash: trust.deposit_tx_hash,
        heartbeatWindowSeconds: trust.heartbeat_window_seconds,
        lastHeartbeatAt: trust.last_heartbeat_at,
        heartbeatDeadline: trust.heartbeat_deadline,
        gracePeriodDeadline: trust.grace_period_deadline || (computedStatus === "in_grace_period" && graceDeadline ? graceDeadline.toISOString() : null),
        hasEncryptedLetter: Boolean(trust.encrypted_letter),
        telegramLinked: Boolean(trust.telegram_chat_id),
        telegramAlertsEnabled: Boolean(trust.telegram_alerts_enabled),
        createdAt: trust.created_at,
        updatedAt: trust.updated_at,
      },
      liveBalances,
      assets: assetsRes.rows,
      vestingSchedules: schedulesRes.rows,
      guardians: guardiansRes.rows,
      claims: claimsRes.rows,
    });
  } catch (err: any) {
    console.error("Error retrieving trust:", err);
    res.status(500).json({ error: "Failed to retrieve trust", details: err.message });
  }
});

/**
 * GET /api/trusts/grantor/:address
 * List all trusts created by a specific grantor
 */
trustsRouter.get("/grantor/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    if (!isValidEvmAddress(address)) {
      res.status(400).json({ error: "Invalid grantor address" });
      return;
    }

    const cleanAddress = getAddress(address);
    const result = await query(
      `SELECT id, name, grantor_address, beneficiary_address, vault_index, vault_address,
              status, is_revocable, corpus_funded, heartbeat_window_seconds,
              last_heartbeat_at, heartbeat_deadline, created_at
       FROM trusts
       WHERE LOWER(grantor_address) = LOWER($1)
       ORDER BY created_at DESC`,
      [cleanAddress]
    );

    res.json({
      grantorAddress: cleanAddress,
      count: result.rows.length,
      trusts: result.rows,
    });
  } catch (err: any) {
    console.error("Error listing grantor trusts:", err);
    res.status(500).json({ error: "Failed to list trusts", details: err.message });
  }
});

/**
 * GET /api/trusts/beneficiary/:address
 * List all trusts where the specified address is beneficiary
 */
trustsRouter.get("/beneficiary/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    if (!isValidEvmAddress(address)) {
      res.status(400).json({ error: "Invalid beneficiary address" });
      return;
    }

    const cleanAddress = getAddress(address);
    const result = await query(
      `SELECT id, name, grantor_address, beneficiary_address, vault_index, vault_address,
              status, is_revocable, corpus_funded, heartbeat_window_seconds,
              last_heartbeat_at, heartbeat_deadline, created_at
       FROM trusts
       WHERE LOWER(beneficiary_address) = LOWER($1)
       ORDER BY created_at DESC`,
      [cleanAddress]
    );

    res.json({
      beneficiaryAddress: cleanAddress,
      count: result.rows.length,
      trusts: result.rows,
    });
  } catch (err: any) {
    console.error("Error listing beneficiary trusts:", err);
    res.status(500).json({ error: "Failed to list trusts", details: err.message });
  }
});

/**
 * POST /api/trusts/:id/fund-verify
 * Verifies on-chain deposit and activates the trust
 */
trustsRouter.post("/:id/fund-verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];

    // If txHash is provided, verify receipt on Robinhood Chain RPC
    let verifiedOnChain = false;
    if (txHash && typeof txHash === "string" && txHash.startsWith("0x")) {
      try {
        const receipt = await rhcClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (receipt && receipt.status === "success") {
          verifiedOnChain = true;
        }
      } catch (rpcErr) {
        console.warn("Could not verify tx receipt via RPC, checking balance fallback:", rpcErr);
      }
    }

    // Fallback: Check if vault address has any non-zero balance
    if (!verifiedOnChain && trust.vault_index !== null) {
      const live = await getVaultLiveBalances(trust.vault_index);
      const hasBalance = live.balances.some((b) => BigInt(b.balanceRaw) > 0n);
      if (hasBalance) {
        verifiedOnChain = true;
      }
    }

    if (!verifiedOnChain) {
      res.status(400).json({
        error: "Corpus deposit could not be verified on-chain yet. Please ensure the transaction has confirmed.",
        vaultAddress: trust.vault_address,
      });
      return;
    }

    const windowSecs = parseInt(trust.heartbeat_window_seconds, 10) || 2592000;
    const newDeadline = new Date(Date.now() + windowSecs * 1000);

    // Update status to active
    await query(
      `UPDATE trusts
       SET corpus_funded = TRUE,
           status = 'active',
           deposit_tx_hash = COALESCE($1, deposit_tx_hash),
           deposit_verified_at = NOW(),
           last_heartbeat_at = NOW(),
           heartbeat_deadline = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [txHash || null, newDeadline, id]
    );

    res.json({
      success: true,
      status: "active",
      message: "Trust corpus verified on Robinhood Chain! Trust is now active.",
      vaultAddress: trust.vault_address,
    });
  } catch (err: any) {
    console.error("Error verifying trust funding:", err);
    res.status(500).json({ error: "Funding verification failed", details: err.message });
  }
});

/**
 * POST /api/trusts/:id/heartbeat
 * Grantor checks in with an off-chain gasless EIP-712 signature
 */
trustsRouter.post("/:id/heartbeat", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress, timestamp, message, signature } = req.body;

    if (!grantorAddress || !timestamp || !signature) {
      res.status(400).json({ error: "grantorAddress, timestamp, and signature are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];

    // Verify caller is grantor
    if (trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()) {
      res.status(403).json({ error: "Only the designated grantor can submit heartbeats" });
      return;
    }

    // Verify EIP-712 cryptographic signature
    const isValid = await verifyHeartbeatSignature({
      trustId: id,
      grantorAddress: getAddress(grantorAddress),
      timestamp: parseInt(timestamp, 10),
      message: message || "I am alive",
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      res.status(401).json({ error: "Invalid cryptographic signature" });
      return;
    }

    // Succession is final once triggered — the beneficiary may already have
    // claimed the corpus. A normal heartbeat must never revert that; only
    // in_grace_period (where nothing has been distributed yet) recovers to
    // active. See docs/Heirloom Private Legacy.pdf §17.1 / ticket #3.
    if (trust.status === "succession_triggered") {
      res.status(409).json({
        error: "This trust's succession has already triggered and cannot be reversed by a normal check-in.",
      });
      return;
    }

    // Record audit log
    await query(
      `INSERT INTO heartbeat_logs (trust_id, grantor_address, signature, signed_timestamp)
       VALUES ($1, $2, $3, $4)`,
      [id, getAddress(grantorAddress), signature, parseInt(timestamp, 10)]
    );

    // Extend heartbeat deadline
    const windowSecs = parseInt(trust.heartbeat_window_seconds, 10) || 2592000;
    const newDeadline = new Date(Date.now() + windowSecs * 1000);

    const updateRes = await query(
      `UPDATE trusts
       SET last_heartbeat_at = NOW(),
           heartbeat_deadline = $1,
           grace_period_deadline = NULL,
           status = CASE WHEN status = 'in_grace_period' THEN 'active' ELSE status END,
           telegram_alert_sent_30d = FALSE,
           telegram_alert_sent_14d = FALSE,
           telegram_alert_sent_7d = FALSE,
           telegram_alert_sent_24h = FALSE,
           telegram_alert_sent_grace = FALSE,
           updated_at = NOW()
       WHERE id = $2
       RETURNING last_heartbeat_at, heartbeat_deadline, grace_period_deadline, status, telegram_chat_id, name`,
      [newDeadline, id]
    );

    const updatedRow = updateRes.rows[0];
    if (updatedRow?.telegram_chat_id) {
      sendCheckinConfirmation(
        updatedRow.telegram_chat_id,
        updatedRow.name || trust.name,
        newDeadline
      ).catch((err) =>
        console.error("[Telegram] Error sending check-in confirmation:", err)
      );
    }

    res.json({
      success: true,
      message: "Heartbeat check-in confirmed. Dead-man's switch extended.",
      status: updatedRow.status,
      lastHeartbeatAt: updatedRow.last_heartbeat_at,
      heartbeatDeadline: updatedRow.heartbeat_deadline,
      gracePeriodDeadline: updatedRow.grace_period_deadline,
    });
  } catch (err: any) {
    console.error("Error submitting heartbeat:", err);
    res.status(500).json({ error: "Failed to submit heartbeat", details: err.message });
  }
});

/**
 * POST /api/trusts/:id/claim
 * Beneficiary claims vested tokens or succession distribution
 */
trustsRouter.post("/:id/claim", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { beneficiaryAddress, tokenSymbolOrAddress, scheduleId } = req.body;

    if (!beneficiaryAddress || !tokenSymbolOrAddress) {
      res.status(400).json({ error: "beneficiaryAddress and tokenSymbolOrAddress are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];

    // Verify caller is the beneficiary
    if (trust.beneficiary_address.toLowerCase() !== beneficiaryAddress.toLowerCase()) {
      res.status(403).json({ error: "Only the designated beneficiary can claim distributions" });
      return;
    }

    // Resolve token
    const token = resolveRobinhoodToken(tokenSymbolOrAddress);
    if (!token) {
      res.status(400).json({ error: `Unsupported token: ${tokenSymbolOrAddress}` });
      return;
    }

    // Check if succession is active OR schedule is unlocked (grace period protects vault assets)
    const now = new Date();
    const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
    const graceDeadline = trust.grace_period_deadline
      ? new Date(trust.grace_period_deadline)
      : deadline
        ? new Date(deadline.getTime() + 28 * 86400 * 1000)
        : null;

    const isSuccession =
      trust.status === "succession_triggered" ||
      (graceDeadline && now > graceDeadline);

    // Grace period pauses ordinary milestone claims — gives the grantor a
    // window to check in before treating a missed heartbeat as succession.
    // Succession-eligible claims (grace deadline already passed) are
    // unaffected by this check.
    const isInGracePeriod =
      !isSuccession &&
      (trust.status === "in_grace_period" ||
        Boolean(deadline && now > deadline && graceDeadline && now <= graceDeadline));

    let isEligible = isSuccession;
    let scheduleRow: any = null;

    if (!isEligible && scheduleId) {
      const schedRes = await query(
        "SELECT * FROM trust_vesting_schedules WHERE id = $1 AND trust_id = $2",
        [scheduleId, id]
      );
      if (schedRes.rows.length > 0) {
        scheduleRow = schedRes.rows[0];
        if (new Date(scheduleRow.unlock_timestamp) <= now && !scheduleRow.claimed && !isInGracePeriod) {
          isEligible = true;
        }
      }
    }

    if (!isEligible) {
      if (isInGracePeriod) {
        res.status(400).json({
          error: "Claims are paused during the 28-day succession grace period. The grantor can check in to resume normal claims.",
        });
        return;
      }
      res.status(400).json({
        error: "Vesting cliff has not unlocked yet and succession switch is not triggered.",
      });
      return;
    }

    // Query vault live balance for this token
    const vaultBalData = await getVaultLiveBalances(trust.vault_index);
    const tokenBal = vaultBalData.balances.find(
      (b) => b.token.address.toLowerCase() === token.address.toLowerCase()
    );

    if (!tokenBal || BigInt(tokenBal.balanceRaw) === 0n) {
      res.status(400).json({
        error: `Dedicated vault has 0 balance for ${token.symbol}.`,
      });
      return;
    }

    // Determine payout amount:
    // If succession or full schedule, claim full balance or percentage
    let amountToClaim = BigInt(tokenBal.balanceRaw);
    if (scheduleRow && scheduleRow.percentage_bps < 10000 && !isSuccession) {
      amountToClaim = (amountToClaim * BigInt(scheduleRow.percentage_bps)) / 10000n;
    }

    if (amountToClaim === 0n) {
      res.status(400).json({ error: "Computed claim amount is 0" });
      return;
    }

    // Execute on-chain payout directly from the dedicated vault account
    const txHash = await executeVaultPayout({
      vaultIndex: trust.vault_index,
      tokenAddress: token.address,
      beneficiaryAddress: getAddress(beneficiaryAddress),
      amountAtomic: amountToClaim,
      isNativeEth: token.isNative,
    });

    const formattedAmount = formatTokenUnits(amountToClaim, token.decimals);

    // Record claim receipt
    await query(
      `INSERT INTO vesting_claims (
        trust_id, schedule_id, beneficiary_address, token_address,
        token_symbol, amount_atomic, amount_formatted, tx_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')`,
      [
        id,
        scheduleId || null,
        getAddress(beneficiaryAddress),
        token.address,
        token.symbol,
        amountToClaim.toString(),
        formattedAmount,
        txHash,
      ]
    );

    if (scheduleRow) {
      await query("UPDATE trust_vesting_schedules SET claimed = TRUE WHERE id = $1", [scheduleRow.id]);
    }

    res.json({
      success: true,
      txHash,
      token: token.symbol,
      amount: formattedAmount,
      beneficiary: beneficiaryAddress,
      explorerUrl: `${config.rhcRpcUrl.includes("blockscout") ? "https://robinhoodchain.blockscout.com" : "https://robinhoodchain.blockscout.com"}/tx/${txHash}`,
    });
  } catch (err: any) {
    console.error("Error executing claim payout:", err);
    res.status(500).json({ error: "Claim payout failed", details: err.message });
  }
});

/**
 * GET /api/trusts/:id/letter
 * Decrypt the grantor's letter if eligible
 */
trustsRouter.get("/:id/letter", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { requester } = req.query;

    if (!requester || typeof requester !== "string" || !isValidEvmAddress(requester)) {
      res.status(400).json({ error: "Valid requester wallet address is required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];
    if (!trust.encrypted_letter) {
      res.status(404).json({ error: "No letter was attached to this trust" });
      return;
    }

    const cleanReq = requester.toLowerCase();
    const isGrantor = cleanReq === trust.grantor_address.toLowerCase();
    const isBeneficiary = cleanReq === trust.beneficiary_address.toLowerCase();

    if (!isGrantor && !isBeneficiary) {
      res.status(403).json({ error: "You are neither the grantor nor the beneficiary of this trust" });
      return;
    }

    // If beneficiary, check if succession has triggered or trust is active
    if (isBeneficiary) {
      const now = new Date();
      const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
      const graceDeadline = trust.grace_period_deadline
        ? new Date(trust.grace_period_deadline)
        : deadline
          ? new Date(deadline.getTime() + 28 * 86400 * 1000)
          : null;
      const isSuccession = trust.status === "succession_triggered" || (graceDeadline && now > graceDeadline);

      // Beneficiaries can read letter if succession triggered OR trust is active or in grace period
      if (!isSuccession && trust.status !== "active" && trust.status !== "in_grace_period") {
        res.status(403).json({
          error: "The letter remains sealed until the trust is active or succession is triggered.",
        });
        return;
      }
    }

    const plainLetter = decryptText(trust.encrypted_letter);

    res.json({
      trustId: id,
      trustName: trust.name,
      letter: plainLetter,
    });
  } catch (err: any) {
    console.error("Error decrypting letter:", err);
    res.status(500).json({ error: "Failed to read letter", details: err.message });
  }
});

/**
 * POST /api/trusts/:id/sealed-deposit
 * Executes a sealed basket deposit via Permit2 and the Heirloom Relayer
 */
trustsRouter.post("/:id/sealed-deposit", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body as SealedDepositPayload;

    if (!payload?.permit || !payload?.signature || !payload?.owner) {
      res.status(400).json({ error: "Missing required fields: permit, signature, and owner are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];
    if (!trust.vault_address) {
      res.status(400).json({ error: "Trust does not have an assigned vault address" });
      return;
    }

    // Execute through sealed relayer
    const result = await executeSealedBasketDeposit({
      vaultAddress: trust.vault_address as `0x${string}`,
      payload,
    });

    // Mark trust funded and active
    const windowSecs = parseInt(trust.heartbeat_window_seconds, 10) || 2592000;
    const newDeadline = new Date(Date.now() + windowSecs * 1000);

    const primaryTxHash = result.swapTxHash || result.pullTxHash;

    await query(
      `UPDATE trusts
       SET corpus_funded = TRUE,
           status = 'active',
           deposit_tx_hash = $1,
           deposit_verified_at = NOW(),
           last_heartbeat_at = NOW(),
           heartbeat_deadline = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [primaryTxHash, newDeadline, id]
    );

    res.json({
      success: true,
      message: "Sealed basket deposit executed successfully on Robinhood Chain",
      txHashes: result,
      vaultAddress: trust.vault_address,
      corpusFunded: true,
    });
  } catch (err: any) {
    console.error("Error executing sealed deposit:", err);
    res.status(500).json({
      error: "Failed to execute sealed basket deposit",
      details: err?.shortMessage || err?.message || String(err),
    });
  }
});

/**
 * POST /api/trusts/:id/legs/inference
 * Grantor configures a recurring CREDIT allowance: usdgPerCycle spent every
 * cadenceDays, activated straight to the beneficiary's Orbio key, until
 * totalUsdg is exhausted. Push-executed by inferenceReleaseWorker — nothing
 * for the beneficiary to claim.
 */
trustsRouter.post("/:id/legs/inference", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress, usdgPerCycle, cadenceDays, totalUsdg, beneficiaryAddress } = req.body;

    if (!grantorAddress || !usdgPerCycle || !cadenceDays || !totalUsdg) {
      res.status(400).json({
        error: "grantorAddress, usdgPerCycle, cadenceDays, and totalUsdg are required",
      });
      return;
    }
    const cadence = parseInt(cadenceDays, 10);
    if (!Number.isInteger(cadence) || cadence < 1) {
      res.status(400).json({ error: "cadenceDays must be a whole number of at least 1" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const trust = trustRes.rows[0];

    if (trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()) {
      res
        .status(403)
        .json({ error: "Only the designated grantor can configure an inference allowance" });
      return;
    }
    if (trust.vault_index === null || trust.vault_index === undefined) {
      res.status(400).json({ error: "Trust has no dedicated vault yet" });
      return;
    }

    const beneficiary = beneficiaryAddress || trust.beneficiary_address;
    if (!isAddress(beneficiary)) {
      res.status(400).json({ error: "beneficiaryAddress is not a valid address" });
      return;
    }

    const usdgPerCycleAtomic = parseUnits(String(usdgPerCycle), 6);
    const totalUsdgAtomic = parseUnits(String(totalUsdg), 6);
    if (usdgPerCycleAtomic <= 0n || totalUsdgAtomic <= 0n) {
      res.status(400).json({ error: "usdgPerCycle and totalUsdg must be greater than 0" });
      return;
    }
    if (usdgPerCycleAtomic > totalUsdgAtomic) {
      res.status(400).json({ error: "usdgPerCycle cannot exceed totalUsdg" });
      return;
    }

    const insertRes = await query(
      `INSERT INTO inference_release_schedules
         (trust_id, beneficiary_address, usdg_per_cycle_atomic, cadence_days, next_release_at, total_remaining_atomic)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING id, next_release_at`,
      [
        id,
        getAddress(beneficiary),
        usdgPerCycleAtomic.toString(),
        cadence,
        totalUsdgAtomic.toString(),
      ],
    );

    res.json({
      success: true,
      scheduleId: insertRes.rows[0].id,
      nextReleaseAt: insertRes.rows[0].next_release_at,
      message: `Inference allowance configured: ${usdgPerCycle} USDG every ${cadence} day(s), ${totalUsdg} USDG total.`,
    });
  } catch (err) {
    console.error("Error configuring inference leg:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to configure inference allowance", details: message });
  }
});

/**
 * GET /api/trusts/:id/legs/inference
 * List configured inference allowances and their release history for a trust.
 */
trustsRouter.get("/:id/legs/inference", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedules = await query(
      "SELECT * FROM inference_release_schedules WHERE trust_id = $1 ORDER BY created_at ASC",
      [id],
    );
    const releases = await query(
      "SELECT * FROM inference_releases WHERE trust_id = $1 ORDER BY created_at DESC LIMIT 50",
      [id],
    );

    // Guardian/beneficiary allowance controls: a cap the schedule enforces every
    // cycle (usdg_per_cycle_atomic), plus a rollover readout — a missed cycle is
    // never dropped, the worker catches it up automatically (see
    // computeRolloverInfo docs), so surface how much is currently accrued.
    const schedulesWithRollover = schedules.rows.map((s) => ({
      ...s,
      rollover: computeRolloverInfo(s),
    }));

    res.json({ schedules: schedulesWithRollover, releases: releases.rows });
  } catch (err) {
    console.error("Error fetching inference legs:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch inference allowances", details: message });
  }
});

/**
 * GET /api/trusts/:id/stake
 * Live staked ORBIO position (read straight from the Staking contract) plus
 * the trust's claim/stake/unstake history.
 */
trustsRouter.get("/:id/stake", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trustRes = await query("SELECT vault_address FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const vaultAddress = trustRes.rows[0].vault_address;

    const [position, minPosition, stakeRow, events] = await Promise.all([
      vaultAddress ? getStakedPosition(vaultAddress) : Promise.resolve(0n),
      getMinPosition(),
      query("SELECT * FROM trust_stakes WHERE trust_id = $1", [id]),
      query("SELECT * FROM stake_events WHERE trust_id = $1 ORDER BY created_at DESC LIMIT 50", [
        id,
      ]),
    ]);

    res.json({
      stakedAtomic: position.toString(),
      minPositionAtomic: minPosition.toString(),
      active: stakeRow.rows[0]?.active ?? false,
      lastClaimAt: stakeRow.rows[0]?.last_claim_at ?? null,
      events: events.rows,
    });
  } catch (err) {
    console.error("Error fetching stake status:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch stake status", details: message });
  }
});

/**
 * POST /api/trusts/:id/stake
 * Grantor stakes ORBIO already sitting in the trust's vault. CREDIT accrues
 * hourly on Orbio's own schedule; stakeClaimWorker sweeps it automatically —
 * nothing further for the grantor or beneficiary to do.
 */
trustsRouter.post("/:id/stake", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress, amountOrbio } = req.body;

    if (!grantorAddress || !amountOrbio) {
      res.status(400).json({ error: "grantorAddress and amountOrbio are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const trust = trustRes.rows[0];

    if (trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()) {
      res.status(403).json({ error: "Only the designated grantor can stake ORBIO" });
      return;
    }
    if (trust.vault_index === null || trust.vault_index === undefined) {
      res.status(400).json({ error: "Trust has no dedicated vault yet" });
      return;
    }

    const amount = parseUnits(String(amountOrbio), 18);
    const minPosition = await getMinPosition();
    if (amount < minPosition) {
      res.status(400).json({
        error: `amountOrbio is below the protocol minimum position (${minPosition} atomic ORBIO)`,
      });
      return;
    }

    const txHash = await executeStake(trust.vault_index, amount);

    await query(
      `INSERT INTO trust_stakes (trust_id, active, staked_at)
       VALUES ($1, TRUE, NOW())
       ON CONFLICT (trust_id) DO UPDATE SET active = TRUE, updated_at = NOW()`,
      [id],
    );
    await query(
      `INSERT INTO stake_events (trust_id, kind, amount_atomic, tx_hash, status)
       VALUES ($1, 'stake', $2, $3, 'confirmed')`,
      [id, amount.toString(), txHash],
    );

    res.json({ success: true, txHash, message: `Staked ${amountOrbio} ORBIO.` });
  } catch (err) {
    console.error("Error staking ORBIO:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to stake ORBIO", details: message });
  }
});

/**
 * POST /api/trusts/:id/unstake
 * Grantor unstakes ORBIO back into the trust's vault.
 */
trustsRouter.post("/:id/unstake", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress, amountOrbio } = req.body;

    if (!grantorAddress || !amountOrbio) {
      res.status(400).json({ error: "grantorAddress and amountOrbio are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const trust = trustRes.rows[0];

    if (trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()) {
      res.status(403).json({ error: "Only the designated grantor can unstake ORBIO" });
      return;
    }
    if (trust.vault_index === null || trust.vault_index === undefined) {
      res.status(400).json({ error: "Trust has no dedicated vault yet" });
      return;
    }

    const amount = parseUnits(String(amountOrbio), 18);
    const txHash = await executeUnstake(trust.vault_index, amount);

    const remaining = trust.vault_address ? await getStakedPosition(trust.vault_address) : 0n;
    if (remaining === 0n) {
      await query(
        `UPDATE trust_stakes SET active = FALSE, updated_at = NOW() WHERE trust_id = $1`,
        [id],
      );
    }
    await query(
      `INSERT INTO stake_events (trust_id, kind, amount_atomic, tx_hash, status)
       VALUES ($1, 'unstake', $2, $3, 'confirmed')`,
      [id, amount.toString(), txHash],
    );

    res.json({ success: true, txHash, message: `Unstaked ${amountOrbio} ORBIO.` });
  } catch (err) {
    console.error("Error unstaking ORBIO:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to unstake ORBIO", details: message });
  }
});

/**
 * POST /api/trusts/:id/succession-ai-budget
 * Grantor configures a one-time USDG amount that gets converted to activated
 * CREDIT for the successor the moment succession triggers — for settling
 * affairs, running the estate's agent. Executed automatically by
 * heartbeatWorker.ts; nothing for the successor to claim.
 */
trustsRouter.post("/:id/succession-ai-budget", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress, budgetUsdg } = req.body;

    if (!grantorAddress || budgetUsdg === undefined || budgetUsdg === null) {
      res.status(400).json({ error: "grantorAddress and budgetUsdg are required" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const trust = trustRes.rows[0];

    if (trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()) {
      res
        .status(403)
        .json({ error: "Only the designated grantor can configure the succession AI budget" });
      return;
    }
    if (trust.succession_ai_granted_at) {
      res.status(400).json({ error: "This trust's succession AI budget has already been granted" });
      return;
    }

    const amount = parseUnits(String(budgetUsdg), 6);
    if (amount < 0n) {
      res.status(400).json({ error: "budgetUsdg cannot be negative" });
      return;
    }

    await query(
      `UPDATE trusts SET succession_ai_budget_usdg_atomic = $1, updated_at = NOW() WHERE id = $2`,
      [amount > 0n ? amount.toString() : null, id],
    );

    res.json({
      success: true,
      message:
        amount > 0n
          ? `Succession AI budget set: ${budgetUsdg} USDG, activated to the successor when succession triggers.`
          : "Succession AI budget cleared.",
    });
  } catch (err) {
    console.error("Error configuring succession AI budget:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to configure succession AI budget", details: message });
  }
});

/**
 * GET /api/trusts/:id/succession-ai-budget
 */
trustsRouter.get("/:id/succession-ai-budget", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trustRes = await query(
      "SELECT succession_ai_budget_usdg_atomic, succession_ai_granted_at FROM trusts WHERE id = $1",
      [id],
    );
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const grants = await query(
      "SELECT * FROM succession_ai_grants WHERE trust_id = $1 ORDER BY created_at DESC",
      [id],
    );
    res.json({
      budgetUsdgAtomic: trustRes.rows[0].succession_ai_budget_usdg_atomic,
      grantedAt: trustRes.rows[0].succession_ai_granted_at,
      grants: grants.rows,
    });
  } catch (err) {
    console.error("Error fetching succession AI budget:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch succession AI budget", details: message });
  }
});

/**
 * POST /api/trusts/:id/telegram-link
 * Generates a one-time pairing token and Telegram bot deep-link for this trust
 */
trustsRouter.post("/:id/telegram-link", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grantorAddress } = req.body || {};

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [id]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    const trust = trustRes.rows[0];
    if (
      grantorAddress &&
      trust.grantor_address.toLowerCase() !== grantorAddress.toLowerCase()
    ) {
      res.status(403).json({ error: "Only the grantor can connect Telegram alerts" });
      return;
    }

    // Generate secure 48-hex-char token
    const token = crypto.randomBytes(24).toString("hex");

    await query(
      `UPDATE trusts
       SET telegram_pairing_token = $1,
           telegram_pairing_expires_at = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $2`,
      [token, id]
    );

    const startLink = buildStartLink(token);

    res.json({
      success: true,
      pairingToken: token,
      startLink,
      botUsername: config.telegramBotUsername,
      expiresInSeconds: 3600,
    });
  } catch (err: any) {
    console.error("Error generating Telegram pairing token:", err);
    res.status(500).json({ error: "Failed to generate pairing token", details: err.message });
  }
});

/**
 * DELETE /api/trusts/:id/telegram-link
 * Unlinks Telegram notifications from this trust
 */
trustsRouter.delete("/:id/telegram-link", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE trusts
       SET telegram_chat_id = NULL,
           telegram_alerts_enabled = FALSE,
           telegram_pairing_token = NULL,
           telegram_pairing_expires_at = NULL,
           telegram_linked_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }

    res.json({
      success: true,
      message: "Telegram disconnected from trust",
    });
  } catch (err: any) {
    console.error("Error unlinking Telegram:", err);
    res.status(500).json({ error: "Failed to unlink Telegram", details: err.message });
  }
});

