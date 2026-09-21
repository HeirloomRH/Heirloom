import { query } from "../db/index.js";
import { executeInferenceRelease, type InferenceReleaseSchedule } from "./inferenceLegService.js";

let intervalHandle: NodeJS.Timeout | null = null;

/**
 * One poll pass: execute every inference-allowance release that's come due.
 * Push, not pull — this is what makes CREDIT allowances "automatic, no
 * human," unlike the beneficiary-claimed vesting schedules.
 */
export async function checkDueInferenceReleases(): Promise<number> {
  let executed = 0;
  try {
    const dueRes = await query(
      `SELECT s.id, s.trust_id, s.beneficiary_address, s.usdg_per_cycle_atomic,
              s.cadence_days, s.total_remaining_atomic, t.vault_index
       FROM inference_release_schedules s
       JOIN trusts t ON t.id = s.trust_id
       WHERE s.active = TRUE
         AND s.next_release_at <= NOW()
         AND t.vault_index IS NOT NULL`,
    );

    const due = (dueRes.rows as InferenceReleaseSchedule[]).filter(
      (row) => BigInt(row.total_remaining_atomic) > 0n,
    );
    if (due.length === 0) return 0;

    console.log(`[InferenceReleaseWorker] ${due.length} release(s) due`);

    for (const schedule of due) {
      try {
        const outcome = await executeInferenceRelease(schedule);

        if (outcome.status === "confirmed") {
          const remaining = BigInt(schedule.total_remaining_atomic) - outcome.usdgSpent;
          const stillActive = remaining > 0n;

          await query(
            `INSERT INTO inference_releases
               (trust_id, schedule_id, beneficiary_address, usdg_spent_atomic, tx_hash, status)
             VALUES ($1, $2, $3, $4, $5, 'confirmed')`,
            [
              schedule.trust_id,
              schedule.id,
              schedule.beneficiary_address,
              outcome.usdgSpent.toString(),
              outcome.txHash,
            ],
          );

          await query(
            `UPDATE inference_release_schedules
             SET total_remaining_atomic = $1,
                 next_release_at = next_release_at + ($2 || ' days')::interval,
                 active = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [remaining.toString(), schedule.cadence_days, stillActive, schedule.id],
          );

          executed += 1;
          console.log(
            `[InferenceReleaseWorker] Released ${outcome.usdgSpent} USDG-equivalent CREDIT for schedule ${schedule.id} (tx ${outcome.txHash})`,
          );
        } else {
          // Deferred or failed: leave next_release_at and total_remaining_atomic
          // untouched so this cycle retries on the next poll instead of silently
          // skipping a payment or double-spending on a partial failure.
          await query(
            `INSERT INTO inference_releases
               (trust_id, schedule_id, beneficiary_address, usdg_spent_atomic, status, detail)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              schedule.trust_id,
              schedule.id,
              schedule.beneficiary_address,
              "0",
              outcome.status,
              outcome.detail,
            ],
          );
          console.warn(
            `[InferenceReleaseWorker] Schedule ${schedule.id} ${outcome.status}: ${outcome.detail}`,
          );
        }
      } catch (err) {
        console.error(`[InferenceReleaseWorker] Unhandled error on schedule ${schedule.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[InferenceReleaseWorker] Error checking due releases:", error);
  }
  return executed;
}

export function startInferenceReleaseWorker(pollIntervalMs: number = 60000): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  console.log(`[InferenceReleaseWorker] Started (interval: ${pollIntervalMs}ms)`);

  checkDueInferenceReleases();

  intervalHandle = setInterval(() => {
    checkDueInferenceReleases();
  }, pollIntervalMs);
}

export function stopInferenceReleaseWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
