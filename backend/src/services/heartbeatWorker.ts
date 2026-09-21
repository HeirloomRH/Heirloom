import { query } from "../db/index.js";
import {
  sendPendingHeartbeatAlerts,
  sendSuccessionAlert,
  sendGracePeriodAlert,
} from "./telegramAlertService.js";

let intervalHandle: NodeJS.Timeout | null = null;

export async function checkDeadManSwitches(): Promise<number> {
  try {
    // Phase 1: Move active trusts past heartbeat_deadline into 28-day safety grace period
    const graceResult = await query(
      `UPDATE trusts
       SET status = 'in_grace_period',
           grace_period_deadline = heartbeat_deadline + INTERVAL '28 days',
           telegram_alert_sent_grace = TRUE,
           updated_at = NOW()
       WHERE status = 'active'
         AND heartbeat_deadline IS NOT NULL
         AND heartbeat_deadline < NOW()
       RETURNING id, name, grantor_address, telegram_chat_id,
                 (heartbeat_deadline + INTERVAL '28 days') AS grace_deadline`
    );

    if (graceResult.rowCount && graceResult.rowCount > 0) {
      console.log(
        `[HeartbeatWorker] Entered 28-day grace period for ${graceResult.rowCount} trust(s):`,
        graceResult.rows.map((r) => `Trust #${r.id} (${r.name})`).join(", ")
      );

      for (const row of graceResult.rows) {
        if (row.telegram_chat_id) {
          sendGracePeriodAlert(
            row.telegram_chat_id,
            row.id,
            row.name,
            new Date(row.grace_deadline)
          ).catch((err) => {
            console.error(
              `[HeartbeatWorker] Failed sending grace period alert for trust ${row.id}:`,
              err
            );
          });
        }
      }
    }

    // Phase 2: If 28-day grace period expires, trigger succession
    const successionResult = await query(
      `UPDATE trusts
       SET status = 'succession_triggered',
           updated_at = NOW()
       WHERE status = 'in_grace_period'
         AND grace_period_deadline IS NOT NULL
         AND grace_period_deadline < NOW()
       RETURNING id, name, grantor_address, beneficiary_address,
                 telegram_chat_id`
    );

    if (successionResult.rowCount && successionResult.rowCount > 0) {
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

    // Send threshold-based heartbeat reminder alerts (30d / 14d / 7d / 24h)
    await sendPendingHeartbeatAlerts();

    return (graceResult.rowCount || 0) + (successionResult.rowCount || 0);
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
