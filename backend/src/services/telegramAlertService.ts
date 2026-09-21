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

const GRACE_ALERT_THRESHOLDS = [
  { column: "telegram_alert_sent_grace_14d", days: 14, label: "14 days", urgent: true },
  { column: "telegram_alert_sent_grace_7d",  days: 7,  label: "7 days",  urgent: true },
  { column: "telegram_alert_sent_grace_24h", days: 0,  hours: 24, label: "24 hours", urgent: true },
] as const;

function formatAlert(trustName: string, label: string, urgent: boolean): string {
  const prefix = urgent ? "🚨 <b>URGENT</b> — " : "⏰ ";
  return (
    `${prefix}Heirloom Heartbeat Reminder\n\n` +
    `Your trust <b>${escapeHtml(trustName)}</b> has <b>${label}</b> remaining before the ` +
    `dead-man's switch activates.\n\n` +
    `Tap below to check in and reset your window.`
  );
}

function formatGraceAlert(trustName: string, label: string): string {
  return (
    `🚨 <b>CRITICAL GRACE PERIOD ALERT</b> 🚨\n\n` +
    `Your trust <b>${escapeHtml(trustName)}</b> has <b>${label}</b> remaining in its 28-Day Grace Period.\n\n` +
    `Vault assets remain locked. Tap below immediately to check in, restore your active status, and reset your heartbeat deadline.`
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

  // Grace Period countdown alerts
  for (const threshold of GRACE_ALERT_THRESHOLDS) {
    const windowHours = "hours" in threshold
      ? threshold.hours
      : threshold.days * 24;

    const sql = `
      SELECT id, name, grace_period_deadline, telegram_chat_id
      FROM trusts
      WHERE status = 'in_grace_period'
        AND telegram_chat_id IS NOT NULL
        AND telegram_alerts_enabled = TRUE
        AND grace_period_deadline IS NOT NULL
        AND ${threshold.column} = FALSE
        AND grace_period_deadline > NOW()
        AND grace_period_deadline <= NOW() + INTERVAL '${windowHours} hours'
    `;

    try {
      const result = await query(sql);
      for (const trust of result.rows) {
        await sendMessage({
          chat_id: trust.telegram_chat_id,
          text: formatGraceAlert(trust.name, threshold.label),
          parse_mode: "HTML",
          reply_markup: buildCheckinKeyboard(trust.id, miniAppUrl),
        });

        await query(
          `UPDATE trusts SET ${threshold.column} = TRUE WHERE id = $1`,
          [trust.id]
        );
      }
    } catch (err) {
      console.error(`[TelegramAlerts] Grace alert error for ${threshold.label}:`, err);
    }
  }
}

/**
 * Immediate alert when trust enters 28-day Grace Period
 */
export async function sendGracePeriodStartAlert(
  chatId: number,
  trustId: string,
  trustName: string
): Promise<void> {
  if (!isBotConfigured()) return;

  const miniAppUrl = config.frontendUrl;

  await sendMessage({
    chat_id: chatId,
    text:
      `🚨 <b>GRACE PERIOD ACTIVATED</b> 🚨\n\n` +
      `Heartbeat deadline for trust <b>${escapeHtml(trustName)}</b> has lapsed!\n\n` +
      `Your trust is now in a <b>28-Day Safety Grace Period</b>. Vault assets remain locked and beneficiary cannot claim yet.\n\n` +
      `Check in immediately to restore status to active and reset your dead-man's switch.`,
    parse_mode: "HTML",
    reply_markup: buildCheckinKeyboard(trustId, miniAppUrl),
  });
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
      `Your trust <b>${escapeHtml(trustName)}</b> is confirmed active.\n` +
      `Your heartbeat window has been reset — next check-in required by <b>${deadlineStr}</b>.`,
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
      `The 28-day grace period for trust <b>${escapeHtml(trustName)}</b> has expired with zero check-ins. ` +
      `The dead-man's switch has activated and the beneficiary may now claim the vault assets.`,
    parse_mode: "HTML",
  });
}
