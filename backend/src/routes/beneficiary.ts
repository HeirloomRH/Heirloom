import { Router, Request, Response } from "express";
import { getAddress, isAddress } from "viem";
import { query } from "../db/index.js";
import { verifyBeneficiaryKeySignature } from "../services/inferenceLegService.js";

export const beneficiaryRouter = Router();

/**
 * POST /api/beneficiary/key
 * Beneficiary registers or rotates the Orbio activation key their INFERENCE
 * allowances get delivered to. Requires an EIP-712 signature proving wallet
 * ownership — this is not the same weak check the vesting /claim route uses.
 */
beneficiaryRouter.post("/key", async (req: Request, res: Response) => {
  try {
    const { trustId, beneficiaryAddress, keyHash, timestamp, signature } = req.body;

    if (!trustId || !beneficiaryAddress || !keyHash || !timestamp || !signature) {
      res.status(400).json({
        error: "trustId, beneficiaryAddress, keyHash, timestamp, and signature are required",
      });
      return;
    }
    if (!isAddress(beneficiaryAddress)) {
      res.status(400).json({ error: "beneficiaryAddress is not a valid address" });
      return;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(keyHash)) {
      res.status(400).json({ error: "keyHash must be a 32-byte hex value" });
      return;
    }

    const trustRes = await query("SELECT * FROM trusts WHERE id = $1", [trustId]);
    if (trustRes.rows.length === 0) {
      res.status(404).json({ error: "Trust not found" });
      return;
    }
    const trust = trustRes.rows[0];
    if (trust.beneficiary_address.toLowerCase() !== beneficiaryAddress.toLowerCase()) {
      res
        .status(403)
        .json({ error: "Only this trust's designated beneficiary can register a key" });
      return;
    }

    const isValid = await verifyBeneficiaryKeySignature({
      trustId,
      beneficiaryAddress: getAddress(beneficiaryAddress),
      keyHash,
      timestamp: parseInt(timestamp, 10),
      signature,
    });
    if (!isValid) {
      res.status(401).json({ error: "Invalid cryptographic signature" });
      return;
    }

    await query(
      `INSERT INTO beneficiary_keys (trust_id, beneficiary_address, key_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (trust_id, beneficiary_address)
       DO UPDATE SET key_hash = EXCLUDED.key_hash, updated_at = NOW()`,
      [trustId, getAddress(beneficiaryAddress), keyHash],
    );

    res.json({ success: true, message: "Beneficiary activation key registered." });
  } catch (err) {
    console.error("Error registering beneficiary key:", err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to register beneficiary key", details: message });
  }
});
