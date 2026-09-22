import { query } from "../db/index.js";
import {
  verifyTypedData,
  getAddress,
  type Address,
  type Hash,
} from "viem";
import { ROBINHOOD_CHAIN_ID } from "../lib/robinhoodTokens.js";
import { config } from "../config.js";

export interface CommitmentRecord {
  trustId: number;
  commitment: string;
  nullifier?: string;
  ciphertext: string;
  blockNumber: number;
}

export interface DisclosureRecord {
  trustId: number;
  granteeAddress: string;
  cipherKey: string;
}

export interface StageKeyRecord {
  trustId: number;
  stageIndex: number;
  keyHash: string;
  cipherKeyPayload: string;
}

export const PRIVACY_EIP712_DOMAIN = {
  name: "Heirloom Privacy Protocol",
  version: config.eip712DomainVersion,
  chainId: ROBINHOOD_CHAIN_ID,
  verifyingContract: getAddress(config.eip712VerifyingContract) as Address,
} as const;

export const PRIVATE_HEARTBEAT_TYPES = {
  PrivateHeartbeat: [
    { name: "trustId", type: "string" },
    { name: "stealthKeyHash", type: "bytes32" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

export class PrivacyService {
  /**
   * Save a new ZK commitment note to indexer
   */
  static async addCommitment(record: CommitmentRecord): Promise<number> {
    const res = await query(
      `INSERT INTO commitments (trust_id, commitment, nullifier, ciphertext, block_number)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (commitment) DO UPDATE SET ciphertext = EXCLUDED.ciphertext
       RETURNING id`,
      [record.trustId, record.commitment, record.nullifier || null, record.ciphertext, record.blockNumber || 0]
    );

    // Increment anonymity set meter count
    await query(`UPDATE sets SET meter_count = meter_count + 1, updated_at = NOW() WHERE name = 'rhc_mainnet_pool_v1'`);

    return res.rows[0].id;
  }

  /**
   * Get all commitments for a private trust
   */
  static async getCommitments(trustId: number): Promise<CommitmentRecord[]> {
    const res = await query(
      `SELECT trust_id as "trustId", commitment, nullifier, ciphertext, block_number as "blockNumber"
       FROM commitments
       WHERE trust_id = $1
       ORDER BY id ASC`,
      [trustId]
    );

    return res.rows;
  }

  /**
   * Save encrypted terms & grantor letter
   */
  static async storePrivateTerms(params: {
    trustId: number;
    termsHash: string;
    cipherTerms: string;
    cipherLetter: string;
    ladder?: any;
  }): Promise<void> {
    await query(
      `UPDATE trusts
       SET mode = 'private',
           terms_hash = $2,
           cipher_terms = $3,
           cipher_letter = $4,
           ladder = $5
       WHERE id = $1`,
      [params.trustId, params.termsHash, params.cipherTerms, params.cipherLetter, params.ladder ? JSON.stringify(params.ladder) : null]
    );

    await query(
      `INSERT INTO trusts_private (trust_id, vault_address, terms_hash, mode, ladder)
       SELECT id, COALESCE(vault_address, ''), $2, 'private', COALESCE($5::jsonb, '{}'::jsonb)
       FROM trusts WHERE id = $1
       ON CONFLICT (trust_id) DO UPDATE SET terms_hash = EXCLUDED.terms_hash, ladder = EXCLUDED.ladder`,
      [params.trustId, params.termsHash, params.cipherTerms, params.cipherLetter, params.ladder ? JSON.stringify(params.ladder) : null]
    );
  }

  /**
   * Get encrypted terms & grantor letter for client-side decryption
   */
  static async getPrivateTerms(trustId: number) {
    const res = await query(
      `SELECT id, mode, terms_hash as "termsHash", cipher_terms as "cipherTerms", cipher_letter as "cipherLetter", ladder
       FROM trusts
       WHERE id = $1`,
      [trustId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  /**
   * Register a stage key delivery for device-bound KeyLadder handoff
   */
  static async deliverStageKey(record: StageKeyRecord): Promise<void> {
    const res = await query(
      `SELECT ladder FROM trusts WHERE id = $1`,
      [record.trustId]
    );

    const currentLadder = res.rows[0]?.ladder || {};
    currentLadder[`stage_${record.stageIndex}`] = {
      keyHash: record.keyHash,
      cipherPayload: record.cipherKeyPayload,
      deliveredAt: new Date().toISOString(),
    };

    await query(
      `UPDATE trusts SET ladder = $2 WHERE id = $1`,
      [record.trustId, JSON.stringify(currentLadder)]
    );
  }

  /**
   * Grant a disclosure key (for tax auditors, courts, regulators)
   */
  static async grantDisclosure(record: DisclosureRecord): Promise<number> {
    const res = await query(
      `INSERT INTO disclosures (trust_id, grantee_address, cipher_key)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [record.trustId, getAddress(record.granteeAddress), record.cipherKey]
    );

    return res.rows[0].id;
  }

  /**
   * Revoke a disclosure key
   */
  static async revokeDisclosure(trustId: number, granteeAddress: string): Promise<boolean> {
    const res = await query(
      `UPDATE disclosures
       SET revoked_at = NOW()
       WHERE trust_id = $1 AND grantee_address = $2 AND revoked_at IS NULL`,
      [trustId, getAddress(granteeAddress)]
    );

    return (res.rowCount || 0) > 0;
  }

  /**
   * Verify relayed private heartbeat signature
   */
  static async verifyPrivateHeartbeat(params: {
    trustId: string;
    stealthKeyHash: `0x${string}`;
    timestamp: number;
    signature: `0x${string}`;
    relayerAddress: `0x${string}`;
  }): Promise<boolean> {
    try {
      const isValid = await verifyTypedData({
        address: getAddress(params.relayerAddress),
        domain: PRIVACY_EIP712_DOMAIN,
        types: PRIVATE_HEARTBEAT_TYPES,
        primaryType: "PrivateHeartbeat",
        message: {
          trustId: params.trustId,
          stealthKeyHash: params.stealthKeyHash,
          timestamp: BigInt(params.timestamp),
        },
        signature: params.signature,
      });

      return isValid;
    } catch (err) {
      console.error("Private heartbeat verification failed:", err);
      return false;
    }
  }

  /**
   * Get solvency proof summary. No shielded-pool proving system is deployed
   * yet (privacy contract addresses are placeholders — see docs/Heirloom
   * Private Legacy.pdf §3), so this must never fabricate a proof or an
   * "isSolvent: true" claim. Returns not_configured until a real epoch with
   * a real solvency_proof exists.
   */
  static async getSolvencySummary() {
    const res = await query(`SELECT * FROM epochs ORDER BY epoch_index DESC LIMIT 1`);
    const meterRes = await query(`SELECT meter_count FROM sets WHERE name = 'rhc_mainnet_pool_v1'`);

    if (res.rows.length === 0) {
      return {
        status: "not_configured" as const,
        latestEpoch: null,
        anonymitySetSize: meterRes.rows[0]?.meter_count ?? null,
        isSolvent: null,
        network: "Robinhood Chain (4663)",
      };
    }

    return {
      // epochs has no verified-solvency column and no verifier is deployed
      // to check solvency_proof against — isSolvent stays null rather than
      // asserting a claim nothing has actually checked.
      status: "live" as const,
      latestEpoch: res.rows[0],
      anonymitySetSize: meterRes.rows[0]?.meter_count ?? null,
      isSolvent: null,
      network: "Robinhood Chain (4663)",
    };
  }
}
