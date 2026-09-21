import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { query } from "../db/index.js";
import { answerCallbackQuery, isBotConfigured } from "../lib/telegram.js";
import { config } from "../config.js";

export const telegramRouter = Router();

/**
 * POST /api/telegram/webhook
 * Receives all updates from the Telegram Bot API.
 * Handles:
 *   - /start <token>  → pairing a Telegram account to a trust
 *   - callback_query  → inline button taps (future extensibility)
 */
telegramRouter.post("/webhook", async (req: Request, res: Response) => {
  // Always respond 200 immediately — Telegram retries if we don't
  res.status(200).json({ ok: true });

  if (!isBotConfigured()) return;

  const update = req.body;

  try {
    // --- Handle /start <pairing_token> ---
    if (update?.message?.text) {
      const text: string = update.message.text.trim();
      const chatId: number = update.message.chat.id;
      const fromUsername: string = update.message.from?.username || "";

      if (text.startsWith("/start ")) {
        const token = text.slice("/start ".length).trim();
        await handlePairing(chatId, token, fromUsername);
        return;
      }

      if (text === "/start") {
        // No token — send welcome message
        await sendWelcome(chatId);
        return;
      }

      if (text === "/status") {
        await handleStatus(chatId);
        return;
      }

      if (text === "/unlink") {
        await handleUnlink(chatId);
        return;
      }
    }

    // --- Handle inline button callbacks ---
    if (update?.callback_query) {
      const cbId: string = update.callback_query.id;
      const data: string = update.callback_query.data || "";
      await answerCallbackQuery(cbId, "Opening check-in…");
      console.log(`[TelegramBot] callback_query received: ${data}`);
    }
  } catch (err) {
    console.error("[TelegramBot] Webhook handler error:", err);
  }
});

async function telegramSend(chatId: number, text: string): Promise<void> {
  const token = config.telegramBotToken;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function sendWelcome(chatId: number): Promise<void> {
  await telegramSend(
    chatId,
    `👋 Welcome to <b>HeirloomRHBot</b>!\n\n` +
    `To receive heartbeat reminders for your trust, open your vault dashboard and tap <b>"Connect Telegram"</b>. ` +
    `A deep-link will bring you back here to complete the pairing.\n\n` +
    `Commands:\n` +
    `/status — Check which trust is linked\n` +
    `/unlink — Remove this chat from your trust`
  );
}

async function handlePairing(chatId: number, token: string, fromUsername: string): Promise<void> {
  if (!token || token.length < 16) {
    await telegramSend(chatId, "❌ Invalid pairing token. Please generate a new link from your vault dashboard.");
    return;
  }

  // Look up trust by pairing token that hasn't expired
  const trustRes = await query(
    `SELECT id, name, grantor_address
     FROM trusts
     WHERE telegram_pairing_token = $1
       AND telegram_pairing_expires_at > NOW()`,
    [token]
  );

  if (trustRes.rows.length === 0) {
    await telegramSend(
      chatId,
      "❌ This pairing link has expired or is invalid.\n\nPlease generate a fresh link from your vault dashboard."
    );
    return;
  }

  const trust = trustRes.rows[0];

  // Link the Telegram chat to the trust
  await query(
    `UPDATE trusts
     SET telegram_chat_id         = $1,
         telegram_alerts_enabled  = TRUE,
         telegram_pairing_token   = NULL,
         telegram_pairing_expires_at = NULL,
         telegram_linked_at       = NOW(),
         telegram_alert_sent_30d  = FALSE,
         telegram_alert_sent_14d  = FALSE,
         telegram_alert_sent_7d   = FALSE,
         telegram_alert_sent_24h  = FALSE,
         updated_at               = NOW()
     WHERE id = $2`,
    [chatId, trust.id]
  );

  console.log(`[TelegramBot] Linked chat ${chatId} (${fromUsername}) to trust ${trust.id} (${trust.name})`);

  await telegramSend(
    chatId,
    `✅ <b>Telegram connected!</b>\n\n` +
    `You'll now receive heartbeat reminders for your trust <b>${escapeHtml(trust.name)}</b>.\n\n` +
    `Alerts will be sent at 30 days, 14 days, 7 days, and 24 hours before the deadline — each with a one-tap check-in button.\n\n` +
    `To unlink, tap /unlink.`
  );
}

async function handleStatus(chatId: number): Promise<void> {
  const res = await query(
    `SELECT id, name, heartbeat_deadline, status
     FROM trusts
     WHERE telegram_chat_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [chatId]
  );

  if (res.rows.length === 0) {
    await telegramSend(chatId, "ℹ️ No trust is linked to this chat. Use /start with your pairing link to connect.");
    return;
  }

  const lines = res.rows.map((t) => {
    const deadline = t.heartbeat_deadline
      ? `deadline ${new Date(t.heartbeat_deadline).toLocaleDateString("en-GB")}`
      : "no deadline set";
    return `• <b>${escapeHtml(t.name)}</b> — ${t.status} (${deadline})`;
  });

  await telegramSend(chatId, `📋 <b>Linked trusts:</b>\n\n${lines.join("\n")}`);
}

async function handleUnlink(chatId: number): Promise<void> {
  const res = await query(
    `UPDATE trusts
     SET telegram_chat_id        = NULL,
         telegram_alerts_enabled = FALSE,
         telegram_linked_at      = NULL,
         updated_at              = NOW()
     WHERE telegram_chat_id = $1
     RETURNING name`,
    [chatId]
  );

  if (res.rowCount && res.rowCount > 0) {
    const names = res.rows.map((r) => escapeHtml(r.name)).join(", ");
    await telegramSend(chatId, `✅ Unlinked from: <b>${names}</b>. You will no longer receive alerts.`);
  } else {
    await telegramSend(chatId, "ℹ️ No trust was linked to this chat.");
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * GET /api/telegram/webhook-status
 * Health check for the webhook integration
 */
telegramRouter.get("/webhook-status", (_req: Request, res: Response) => {
  res.json({
    configured: isBotConfigured(),
    botUsername: config.telegramBotUsername,
  });
});
