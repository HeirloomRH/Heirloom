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
import { config } from "../config.js";
import { getAddress, isAddress } from "viem";

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
    const encryptedLetter = letterToBeneficiary ? encryptText(letterToBeneficiary) : null;

    // 3. Compute initial deadline
    const windowSecs = Math.max(300, parseInt(heartbeatWindowSeconds, 10) || 2592000); // minimum 5 mins
    const initialDeadline = new Date(Date.now() + windowSecs * 1000);

    const insertTrustRes = await client.query(
      `INSERT INTO trusts (
        name, grantor_address, beneficiary_address, vault_index, vault_address,
        is_revocable, status, heartbeat_window_seconds, last_heartbeat_at,
        heartbeat_deadline, encrypted_letter, terms_json
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'pending_funding', $7, NOW(),
        $8, $9, $10
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

    // Check dead-man's switch status
    const now = new Date();
    const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
    const isSuccessionTriggered =
      trust.status === "succession_triggered" || (deadline && now > deadline && trust.status === "active");

    res.json({
      trust: {
        id: trust.id,
        name: trust.name,
        grantorAddress: trust.grantor_address,
        beneficiaryAddress: trust.beneficiary_address,
        vaultIndex: trust.vault_index,
        vaultAddress: trust.vault_address,
        status: isSuccessionTriggered ? "succession_triggered" : trust.status,
        isRevocable: trust.is_revocable,
        corpusFunded: trust.corpus_funded,
        depositTxHash: trust.deposit_tx_hash,
        heartbeatWindowSeconds: trust.heartbeat_window_seconds,
        lastHeartbeatAt: trust.last_heartbeat_at,
        heartbeatDeadline: trust.heartbeat_deadline,
        hasEncryptedLetter: Boolean(trust.encrypted_letter),
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
           status = CASE WHEN status = 'succession_triggered' THEN 'active' ELSE status END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING last_heartbeat_at, heartbeat_deadline, status`,
      [newDeadline, id]
    );

    res.json({
      success: true,
      message: "Heartbeat check-in confirmed. Dead-man's switch extended.",
      status: updateRes.rows[0].status,
      lastHeartbeatAt: updateRes.rows[0].last_heartbeat_at,
      heartbeatDeadline: updateRes.rows[0].heartbeat_deadline,
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

    // Check if succession is active OR schedule is unlocked
    const now = new Date();
    const deadline = trust.heartbeat_deadline ? new Date(trust.heartbeat_deadline) : null;
    const isSuccession = trust.status === "succession_triggered" || (deadline && now > deadline);

    let isEligible = isSuccession;
    let scheduleRow: any = null;

    if (!isEligible && scheduleId) {
      const schedRes = await query(
        "SELECT * FROM trust_vesting_schedules WHERE id = $1 AND trust_id = $2",
        [scheduleId, id]
      );
      if (schedRes.rows.length > 0) {
        scheduleRow = schedRes.rows[0];
        if (new Date(scheduleRow.unlock_timestamp) <= now && !scheduleRow.claimed) {
          isEligible = true;
        }
      }
    }

    if (!isEligible) {
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
      const isSuccession = trust.status === "succession_triggered" || (deadline && now > deadline);

      // Beneficiaries can read letter if succession triggered OR trust is active
      if (!isSuccession && trust.status !== "active") {
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
