import { query } from "../db/index.js";
import { getVaultAccount, getVaultAddress, executeVaultPayout } from "./vaultService.js";
import { fetchWalletBalances, parseTokenUnits, ETH } from "../lib/robinhoodTokens.js";
import { PrivacyService } from "./privacyService.js";

export interface MigrationParams {
  trustId: number;
  targetMode: "public" | "private";
  grantorSignature: string;
  targetVaultAddress?: string;
  termsHash?: string;
  cipherTerms?: string;
  cipherLetter?: string;
}

export class MigrationService {
  /**
   * Migrate a trust from custodial beta HD vault to on-chain TrustVault or PrivateTrustVault
   */
  static async migrateTrust(params: MigrationParams) {
    const { trustId, targetMode, targetVaultAddress, termsHash, cipherTerms, cipherLetter } = params;

    // 1. Fetch current trust record
    const res = await query(`SELECT * FROM trusts WHERE id = $1`, [trustId]);
    if (res.rows.length === 0) {
      throw new Error(`Trust #${trustId} not found`);
    }

    const trust = res.rows[0];
    const vaultIndex = trust.vault_index !== null ? trust.vault_index : trustId;
    const currentVaultAddress = trust.vault_address || getVaultAddress(vaultIndex);

    // 2. Fetch live balances in the custodial vault
    const balances = await fetchWalletBalances(currentVaultAddress as `0x${string}`);
    const nonZeroBalances = balances.filter((b) => BigInt(b.balanceRaw) > 0n);

    const txHashes: string[] = [];
    const destination = (targetVaultAddress || currentVaultAddress) as `0x${string}`;

    // 3. Transfer non-zero assets from HD vault to target vault address
    for (const item of nonZeroBalances) {
      try {
        const hash = await executeVaultPayout({
          vaultIndex,
          tokenAddress: item.token.address,
          beneficiaryAddress: destination,
          amountAtomic: BigInt(item.balanceRaw),
          isNativeEth: item.token.isNative,
        });
        txHashes.push(hash);
      } catch (err) {
        console.error(`Migration payout failed for token ${item.token.symbol}:`, err);
      }
    }

    // 4. Update trust status in database to on-chain / migrated
    if (targetMode === "private" && termsHash && cipherTerms && cipherLetter) {
      await PrivacyService.storePrivateTerms({
        trustId,
        termsHash,
        cipherTerms,
        cipherLetter,
      });
    }

    await query(
      `UPDATE trusts
       SET mode = $2,
           status = 'active',
           vault_address = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [trustId, targetMode, destination]
    );

    return {
      trustId,
      migratedMode: targetMode,
      targetVaultAddress: destination,
      transferTxHashes: txHashes,
      status: "migrated_on_chain",
    };
  }

  /**
   * Check if any unmigrated custodial trusts remain
   */
  static async getCustodialBetaStatus() {
    const res = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE mode = 'public' AND vault_address IS NOT NULL) as public_count,
              COUNT(*) FILTER (WHERE mode = 'private') as private_count
       FROM trusts`
    );

    const row = res.rows[0];
    const total = parseInt(row.total || "0", 10);
    const privateCount = parseInt(row.private_count || "0", 10);
    const publicCount = parseInt(row.public_count || "0", 10);

    return {
      totalTrusts: total,
      publicOnChain: publicCount,
      privateShielded: privateCount,
      custodialBetaActive: total > (publicCount + privateCount),
    };
  }
}
