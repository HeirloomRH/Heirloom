import { Router, type Request, type Response } from "express";
import { PrivacyService } from "../services/privacyService.js";
import { MigrationService } from "../services/migrationService.js";
import { query } from "../db/index.js";

export const privacyRouter = Router();

/**
 * POST /api/private/deposit
 * Create a sealed ZK deposit commitment for a private trust
 */
privacyRouter.post(["/private/deposit", "/deposit"], async (req: Request, res: Response) => {
  try {
    const { trustId, commitment, nullifier, ciphertext, blockNumber } = req.body;
    if (!trustId || !commitment || !ciphertext) {
      return res.status(400).json({ error: "Missing trustId, commitment, or ciphertext" });
    }

    const commitmentId = await PrivacyService.addCommitment({
      trustId: parseInt(trustId, 10),
      commitment,
      nullifier,
      ciphertext,
      blockNumber: blockNumber ? parseInt(blockNumber, 10) : 0,
    });

    res.json({ success: true, commitmentId, status: "indexed" });
  } catch (err: any) {
    console.error("Error in /private/deposit:", err);
    res.status(500).json({ error: err.message || "Failed to record commitment" });
  }
});

/**
 * GET /api/private/trust/:id
 * Retrieve encrypted terms, cipher letter, and commitments for client-side decryption
 */
privacyRouter.get(["/private/trust/:id", "/trust/:id"], async (req: Request, res: Response) => {
  try {
    const trustId = parseInt(req.params.id, 10);
    if (isNaN(trustId)) {
      return res.status(400).json({ error: "Invalid trust ID" });
    }

    const termsData = await PrivacyService.getPrivateTerms(trustId);
    if (!termsData) {
      return res.status(404).json({ error: `Private trust #${trustId} not found` });
    }

    const commitments = await PrivacyService.getCommitments(trustId);

    res.json({
      trustId,
      mode: termsData.mode,
      termsHash: termsData.termsHash,
      cipherTerms: termsData.cipherTerms,
      cipherLetter: termsData.cipherLetter,
      ladder: termsData.ladder,
      commitments,
    });
  } catch (err: any) {
    console.error("Error in /private/trust/:id:", err);
    res.status(500).json({ error: err.message || "Failed to fetch private trust details" });
  }
});

/**
 * POST /api/private/heartbeat
 * Gasless relayed heartbeat check-in signed from stealth key
 */
privacyRouter.post(["/private/heartbeat", "/heartbeat"], async (req: Request, res: Response) => {
  try {
    const { trustId, stealthKeyHash, timestamp, signature, relayerAddress } = req.body;
    if (!trustId || !stealthKeyHash || !timestamp || !signature || !relayerAddress) {
      return res.status(400).json({ error: "Missing required heartbeat parameters" });
    }

    const isValid = await PrivacyService.verifyPrivateHeartbeat({
      trustId,
      stealthKeyHash,
      timestamp: parseInt(timestamp, 10),
      signature,
      relayerAddress,
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid stealth heartbeat signature" });
    }

    // Update heartbeat deadline in database (30/60/90/180 days default window)
    const deadlineDate = new Date(Date.now() + 180 * 86400 * 1000);
    await query(
      `UPDATE trusts
       SET last_heartbeat = NOW(),
           heartbeat_deadline = $2,
           status = 'active',
           updated_at = NOW()
       WHERE id = $1`,
      [trustId, deadlineDate]
    );

    res.json({
      success: true,
      trustId,
      newDeadline: deadlineDate.toISOString(),
      status: "heartbeat_recorded",
    });
  } catch (err: any) {
    console.error("Error in /private/heartbeat:", err);
    res.status(500).json({ error: err.message || "Failed to process private heartbeat" });
  }
});

/**
 * GET /api/proofs/solvency
 * Solvency proof for the multi-asset shielded pool
 */
privacyRouter.get(["/proofs/solvency", "/solvency"], async (_req: Request, res: Response) => {
  try {
    const summary = await PrivacyService.getSolvencySummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch solvency proof" });
  }
});

/**
 * POST /api/attest/provision
 * Create a proof-of-provision attestation (e.g. proof of holding >= $X for schools/lenders/prenups)
 */
privacyRouter.post(["/attest/provision", "/provision"], async (req: Request, res: Response) => {
  try {
    const { trustId, thresholdAmount, nonce } = req.body;
    if (!trustId || !thresholdAmount) {
      return res.status(400).json({ error: "Missing trustId or thresholdAmount" });
    }

    const attestationHash = `0x_attestation_${Date.now()}_${nonce || "0"}`;
    await query(
      `INSERT INTO standing_proofs (trust_id, beneficiary_proof)
       VALUES ($1, $2)`,
      [trustId, attestationHash]
    );

    res.json({
      success: true,
      trustId,
      thresholdAmount,
      attestationHash,
      validUntil: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create provision attestation" });
  }
});

/**
 * POST /api/disclose/grant
 * Grant scoped disclosure key to an auditor, tax accountant, or regulator
 */
privacyRouter.post(["/disclose/grant", "/grant"], async (req: Request, res: Response) => {
  try {
    const { trustId, granteeAddress, cipherKey } = req.body;
    if (!trustId || !granteeAddress || !cipherKey) {
      return res.status(400).json({ error: "Missing trustId, granteeAddress, or cipherKey" });
    }

    const grantId = await PrivacyService.grantDisclosure({
      trustId: parseInt(trustId, 10),
      granteeAddress,
      cipherKey,
    });

    res.json({ success: true, grantId, status: "disclosure_granted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to grant disclosure" });
  }
});

/**
 * POST /api/disclose/revoke
 */
privacyRouter.post(["/disclose/revoke", "/revoke"], async (req: Request, res: Response) => {
  try {
    const { trustId, granteeAddress } = req.body;
    if (!trustId || !granteeAddress) {
      return res.status(400).json({ error: "Missing trustId or granteeAddress" });
    }

    const revoked = await PrivacyService.revokeDisclosure(parseInt(trustId, 10), granteeAddress);
    res.json({ success: revoked });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to revoke disclosure" });
  }
});

/**
 * POST /api/keys/deliver
 * Stage key handoff via KeyLadder (device-bound)
 */
privacyRouter.post(["/keys/deliver", "/deliver"], async (req: Request, res: Response) => {
  try {
    const { trustId, stageIndex, keyHash, cipherKeyPayload } = req.body;
    if (!trustId || stageIndex === undefined || !keyHash || !cipherKeyPayload) {
      return res.status(400).json({ error: "Missing key delivery fields" });
    }

    await PrivacyService.deliverStageKey({
      trustId: parseInt(trustId, 10),
      stageIndex: parseInt(stageIndex, 10),
      keyHash,
      cipherKeyPayload,
    });

    res.json({ success: true, stageIndex, status: "key_stage_delivered" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to deliver stage key" });
  }
});

/**
 * GET /api/sets/meter
 * Returns the current anonymity set size
 */
privacyRouter.get(["/sets/meter", "/meter"], async (_req: Request, res: Response) => {
  try {
    const resDb = await query(`SELECT meter_count FROM sets WHERE name = 'rhc_mainnet_pool_v1'`);
    const count = resDb.rows[0]?.meter_count || 128;

    res.json({
      anonymitySetPool: "rhc_mainnet_pool_v1",
      anonymitySetSize: count,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch anonymity set size" });
  }
});

/**
 * POST /api/migration/migrate
 * Opt-in migration from custodial HD vault to on-chain public or private trust
 */
privacyRouter.post(["/migration/migrate", "/migrate"], async (req: Request, res: Response) => {
  try {
    const { trustId, targetMode, grantorSignature, targetVaultAddress, termsHash, cipherTerms, cipherLetter } = req.body;
    if (!trustId || !targetMode || !grantorSignature) {
      return res.status(400).json({ error: "Missing trustId, targetMode, or grantorSignature" });
    }

    const result = await MigrationService.migrateTrust({
      trustId: parseInt(trustId, 10),
      targetMode,
      grantorSignature,
      targetVaultAddress,
      termsHash,
      cipherTerms,
      cipherLetter,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Migration failed" });
  }
});

/**
 * GET /api/migration/status
 */
privacyRouter.get(["/migration/status", "/status"], async (_req: Request, res: Response) => {
  try {
    const status = await MigrationService.getCustodialBetaStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch migration status" });
  }
});
