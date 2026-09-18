import { query } from "../db/index.js";

let intervalHandle: NodeJS.Timeout | null = null;

export async function checkDeadManSwitches(): Promise<number> {
  try {
    const result = await query(
      `UPDATE trusts
       SET status = 'succession_triggered',
           updated_at = NOW()
       WHERE status = 'active'
         AND heartbeat_deadline IS NOT NULL
         AND heartbeat_deadline < NOW()
       RETURNING id, name, grantor_address, beneficiary_address`
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(
        `[HeartbeatWorker] Triggered succession for ${result.rowCount} trust(s):`,
        result.rows.map((r) => `Trust #${r.id} (${r.name})`).join(", ")
      );
    }

    return result.rowCount || 0;
  } catch (error) {
    console.error("[HeartbeatWorker] Error checking dead-man's switches:", error);
    return 0;
  }
}

export function startHeartbeatWorker(pollIntervalMs: number = 60000): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  console.log(`[HeartbeatWorker] Started dead-man's switch monitor (interval: ${pollIntervalMs}ms)`);

  // Run immediately once on startup
  checkDeadManSwitches();

  intervalHandle = setInterval(() => {
    checkDeadManSwitches();
  }, pollIntervalMs);
}

export function stopHeartbeatWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
