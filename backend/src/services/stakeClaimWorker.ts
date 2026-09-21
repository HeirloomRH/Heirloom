import { query } from "../db/index.js";
import { executeClaim } from "./orbioStakeService.js";

let intervalHandle: NodeJS.Timeout | null = null;

interface ActiveStake {
  trust_id: string;
  vault_index: number;
}

/**
 * One poll pass: claim() for every trust with an active stake. Orbio settles
 * hourly on its own schedule (its keeper, not ours) — this just sweeps
 * whatever's accrued since the last pass straight into the vault's CREDIT
 * balance, same "no human in the loop" shape as inferenceReleaseWorker.
 */
export async function checkStakeClaims(): Promise<number> {
  let claimed = 0;
  try {
    const activeRes = await query(
      `SELECT s.trust_id, t.vault_index
       FROM trust_stakes s
       JOIN trusts t ON t.id = s.trust_id
       WHERE s.active = TRUE
         AND t.vault_index IS NOT NULL`,
    );

    const active = activeRes.rows as ActiveStake[];
    if (active.length === 0) return 0;

    for (const stake of active) {
      try {
        const { txHash, creditReceived } = await executeClaim(stake.vault_index);

        await query(
          `INSERT INTO stake_events (trust_id, kind, amount_atomic, tx_hash, status)
           VALUES ($1, 'claim', $2, $3, 'confirmed')`,
          [stake.trust_id, creditReceived.toString(), txHash],
        );
        await query(
          `UPDATE trust_stakes SET last_claim_at = NOW(), updated_at = NOW() WHERE trust_id = $1`,
          [stake.trust_id],
        );

        if (creditReceived > 0n) {
          claimed += 1;
          console.log(
            `[StakeClaimWorker] Claimed ${creditReceived} CREDIT for trust ${stake.trust_id} (tx ${txHash})`,
          );
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`[StakeClaimWorker] Claim failed for trust ${stake.trust_id}:`, detail);
        await query(
          `INSERT INTO stake_events (trust_id, kind, amount_atomic, status, detail)
           VALUES ($1, 'claim', '0', 'failed', $2)`,
          [stake.trust_id, detail],
        );
      }
    }
  } catch (error) {
    console.error("[StakeClaimWorker] Error checking active stakes:", error);
  }
  return claimed;
}

export function startStakeClaimWorker(pollIntervalMs: number = 60000): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  console.log(`[StakeClaimWorker] Started (interval: ${pollIntervalMs}ms)`);

  checkStakeClaims();

  intervalHandle = setInterval(() => {
    checkStakeClaims();
  }, pollIntervalMs);
}

export function stopStakeClaimWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
