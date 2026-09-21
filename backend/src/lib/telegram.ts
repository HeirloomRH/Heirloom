import { config } from "../config.js";

const TELEGRAM_API = `https://api.telegram.org/bot${config.telegramBotToken}`;

export interface TelegramMessage {
  chat_id: number | string;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: InlineKeyboardMarkup;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

async function telegramPost<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API ${method} failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram API ${method} error: ${data.description}`);
  }

  return data.result;
}

/**
 * Send a message to a Telegram chat
 */
export async function sendMessage(params: TelegramMessage): Promise<void> {
  await telegramPost("sendMessage", params);
}

/**
 * Answer a callback query (dismisses the loading spinner on inline buttons)
 */
export async function answerCallbackQuery(
  callback_query_id: string,
  text?: string
): Promise<void> {
  await telegramPost("answerCallbackQuery", { callback_query_id, text });
}

/**
 * Register a webhook URL with Telegram
 */
export async function setWebhook(webhookUrl: string): Promise<void> {
  await telegramPost("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

/**
 * Delete the currently registered webhook
 */
export async function deleteWebhook(): Promise<void> {
  await telegramPost("deleteWebhook", { drop_pending_updates: false });
}

/**
 * Get current webhook diagnostic information from Telegram
 */
export async function getWebhookInfo(): Promise<any> {
  return telegramPost("getWebhookInfo", {});
}

/**
 * Build a Telegram deep-link URL for the bot with a start payload
 */
export function buildStartLink(payload: string): string {
  return `https://t.me/${config.telegramBotUsername}?start=${encodeURIComponent(payload)}`;
}

/**
 * Build the "💓 Check In" inline keyboard for heartbeat alerts.
 * Uses Telegram Mini App (web_app) on HTTPS so the check-in modal
 * launches seamlessly inside the Telegram screen without leaving the app.
 */
export function buildCheckinKeyboard(trustId: string, miniAppUrl: string): InlineKeyboardMarkup {
  const checkinUrl = `${miniAppUrl}/vault/${trustId}?checkin=1`;
  const isHttps = checkinUrl.startsWith("https://");

  return {
    inline_keyboard: [
      [
        isHttps
          ? {
              text: "💓 Check In (Gasless)",
              web_app: { url: checkinUrl },
            }
          : {
              text: "💓 Check In (Gasless)",
              url: checkinUrl,
            },
      ],
    ],
  };
}

export const isBotConfigured = () => Boolean(config.telegramBotToken);
