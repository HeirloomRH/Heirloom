import { query } from "../db/index.js";
import {
  sendMessage,
  buildCheckinKeyboard,
  isBotConfigured,
} from "../lib/telegram.js";
import { config } from "../config.js";

// How many days/hours before deadline to send each alert
const ALERT_THRESHOLDS = [
  { column: "telegram_alert_sent_30d", days: 30, label: "30 days", urgent: false },
  { column: "telegram_alert_sent_14d", days: 14, label: "14 days", urgent: false },
  { column: "telegram_alert_sent_7d",  days: 7,  label: "7 days",  urgent: false },
  { column: "telegram_alert_sent_24h", days: 0,  hours: 24, label: "24 hours", urgent: true },
] as const;

function formatAlert(trustName: string, label: string, urgent: boolean): string {
  const prefix = urgent ? "🚨 <b>URGENT</b> — " : "⏰ ";
  return (
    `${prefix}Heirloom Heartbeat Reminder\n\n` +
    `Your trust <b>${escapeHtml(trustName)}</b> has <b>${label}</b> remaining before the ` +
    `dead-man's switch activates.\n\n` +
    `Tap below to check in and reset your 90-day window.`
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Check all active trusts with Telegram linked and send alerts at appropriate thresholds.
 * Called by the heartbeat worker on each polling cycle.
 */
export async function sendPendingHeartbeatAlerts(): Promise<void> {
  if (!isBotConfigured()) return;

  const miniAppUrl = config.frontendUrl;

  for (const threshold of ALERT_THRESHOLDS) {
    const windowHours = "hours" in threshold
      ? threshold.hours
      : threshold.days * 24;

    const sql = `
      SELECT id, name, heartbeat_deadline, telegram_chat_id
      FROM trusts
      WHERE status = 'active'
        AND telegram_chat_id IS NOT NULL
        AND telegram_alerts_enabled = TRUE
        AND heartbeat_deadline IS NOT NULL
        AND ${threshold.column} = FALSE
        AND heartbeat_deadline > NOW()
        AND heartbeat_deadline <= NOW() + INTERVAL '${windowHours} hours'
    `;

    let rows: Array<{
      id: string;
      name: string;
      heartbeat_deadline: string;
      telegram_chat_id: number;
    }>;

    try {
      const result = await query(sql);
      rows = result.rows;
    } catch (err) {
      console.error(`[TelegramAlerts] Query error for threshold ${threshold.label}:`, err);
      continue;
    }

    for (const trust of rows) {
      try {
        await sendMessage({
          chat_id: trust.telegram_chat_id,
          text: formatAlert(trust.name, threshold.label, threshold.urgent),
          parse_mode: "HTML",
          reply_markup: buildCheckinKeyboard(trust.id, miniAppUrl),
        });

        // Mark this threshold as sent so we don't spam
        await query(
          `UPDATE trusts SET ${threshold.column} = TRUE WHERE id = $1`,
          [trust.id]
        );

        console.log(
          `[TelegramAlerts] Sent ${threshold.label} alert to chat ${trust.telegram_chat_id} for trust ${trust.id}`
        );
      } catch (err) {
        console.error(
          `[TelegramAlerts] Failed to send ${threshold.label} alert for trust ${trust.id}:`,
          err
        );
      }
    }
  }
}

/**
 * Send a single immediate alert to a specific trust's linked Telegram chat.
 * Used by the heartbeat endpoint to confirm check-in success.
 */
export async function sendCheckinConfirmation(
  chatId: number,
  trustName: string,
  newDeadline: Date
): Promise<void> {
  if (!isBotConfigured()) return;

  const deadlineStr = newDeadline.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await sendMessage({
    chat_id: chatId,
    text:
      `✅ <b>Heartbeat recorded!</b>\n\n` +
      `Your trust <b>${escapeHtml(trustName)}</b> is confirmed alive.\n` +
      `Your 90-day window has been reset — next check-in required by <b>${deadlineStr}</b>.`,
    parse_mode: "HTML",
  });
}

/**
 * Send a succession triggered notification.
 */
export async function sendSuccessionAlert(
  chatId: number,
  trustName: string
): Promise<void> {
  if (!isBotConfigured()) return;

  await sendMessage({
    chat_id: chatId,
    text:
      `💀 <b>Succession Triggered</b>\n\n` +
      `The dead-man's switch for trust <b>${escapeHtml(trustName)}</b> has activated. ` +
      `The beneficiary may now claim the vault assets.`,
    parse_mode: "HTML",
  });
}

/**
 * Send an urgent notification when a trust enters the 28-day safety grace period
 */
export async function sendGracePeriodAlert(
  chatId: number,
  trustId: string,
  trustName: string,
  graceDeadline: Date
): Promise<void> {
  if (!isBotConfigured()) return;

  const deadlineStr = graceDeadline.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const miniAppUrl = config.frontendUrl;

  await sendMessage({
    chat_id: chatId,
    text:
      `⚠️ <b>SAFETY GRACE PERIOD ACTIVATED (28 Days)</b>\n\n` +
      `Your trust <b>${escapeHtml(trustName)}</b> missed its standard check-in deadline.\n\n` +
      `🛡️ <i>Your vault assets remain locked.</i> The beneficiary cannot claim yet.\n\n` +
      `You have until <b>${deadlineStr}</b> to submit your vitality check-in before succession triggers.\n\n` +
      `Tap below to check in right now and restore your trust to active status:`,
    parse_mode: "HTML",
    reply_markup: buildCheckinKeyboard(trustId, miniAppUrl),
  });
}
