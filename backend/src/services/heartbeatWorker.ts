import { query } from "../db/index.js";
import {
  sendPendingHeartbeatAlerts,
  sendGracePeriodStartAlert,
  sendSuccessionAlert,
} from "./telegramAlertService.js";

let intervalHandle: NodeJS.Timeout | null = null;

export async function checkDeadManSwitches(): Promise<number> {
  try {
    let affectedTotal = 0;

    // Phase 1: Move trusts past heartbeat_deadline into 'in_grace_period'
    const graceResult = await query(
      `UPDATE trusts
       SET status = 'in_grace_period',
           grace_period_deadline = COALESCE(grace_period_deadline, heartbeat_deadline + INTERVAL '28 days'),
           telegram_alert_sent_grace_start = TRUE,
           updated_at = NOW()
       WHERE status = 'active'
         AND heartbeat_deadline IS NOT NULL
         AND NOW() > heartbeat_deadline
         AND NOW() <= COALESCE(grace_period_deadline, heartbeat_deadline + INTERVAL '28 days')
       RETURNING id, name, grantor_address, beneficiary_address, telegram_chat_id, grace_period_deadline`
    );

    if (graceResult.rowCount && graceResult.rowCount > 0) {
      affectedTotal += graceResult.rowCount;
      console.log(
        `[HeartbeatWorker] Entered 28-day grace period for ${graceResult.rowCount} trust(s):`,
        graceResult.rows.map((r) => `Trust #${r.id} (${r.name})`).join(", ")
      );

      for (const row of graceResult.rows) {
        if (row.telegram_chat_id) {
          sendGracePeriodStartAlert(row.telegram_chat_id, row.id, row.name).catch((err) => {
            console.error(
              `[HeartbeatWorker] Failed sending grace period alert for trust ${row.id}:`,
              err
            );
          });
        }
      }
    }

    // Phase 2: Trigger succession for trusts past grace_period_deadline
    const successionResult = await query(
      `UPDATE trusts
       SET status = 'succession_triggered',
           updated_at = NOW()
       WHERE status IN ('active', 'in_grace_period')
         AND (
           (grace_period_deadline IS NOT NULL AND NOW() > grace_period_deadline)
           OR (grace_period_deadline IS NULL AND heartbeat_deadline IS NOT NULL AND NOW() > heartbeat_deadline + INTERVAL '28 days')
         )
       RETURNING id, name, grantor_address, beneficiary_address, telegram_chat_id`
    );

    if (successionResult.rowCount && successionResult.rowCount > 0) {
      affectedTotal += successionResult.rowCount;
      console.log(
        `[HeartbeatWorker] Triggered succession for ${successionResult.rowCount} trust(s):`,
        successionResult.rows.map((r) => `Trust #${r.id} (${r.name})`).join(", ")
      );

      // Notify each affected grantor via Telegram
      for (const row of successionResult.rows) {
        if (row.telegram_chat_id) {
          sendSuccessionAlert(row.telegram_chat_id, row.name).catch((err) => {
            console.error(
              `[HeartbeatWorker] Failed sending succession alert for trust ${row.id}:`,
              err
            );
          });
        }
      }
    }

    // Send threshold-based heartbeat and grace period reminder alerts
    await sendPendingHeartbeatAlerts();

    return affectedTotal;
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
