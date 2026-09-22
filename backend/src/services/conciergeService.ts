import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { config } from "../config.js";

// Heirloom's own agent concierge, running on Orbio inference and paid for with
// studio-held CREDIT. ORBIO_STUDIO_PRIVATE_KEY currently falls back to the
// deposit relayer key if unset (see config.ts) — an approved tradeoff, but it
// means this wallet may also hold standing token approvals from the deposit
// flow. Set ORBIO_STUDIO_PRIVATE_KEY explicitly to use a dedicated wallet
// with no custody of grantor/beneficiary funds instead.
//
// Auth scheme per Orbio's gateway docs (orbio.so/protocol/agents): the studio
// wallet signs `Orbio API key · chain <chainId> · epoch <epoch>` and the
// resulting credential is sent as a bearer token. This was pulled from their
// docs page, not from a live request/response against the gateway, so treat
// it as best-effort until smoke-tested.
const EPOCH_SECONDS = 3600; // one signed credential per hour, reused across requests

let cachedEpoch = -1;
let cachedKey = "";

function getStudioAccount() {
  const rawKey = config.orbioStudioPrivateKey.trim();
  if (!rawKey) return null;
  const formatted = rawKey.startsWith("0x") ? (rawKey as Hex) : (`0x${rawKey}` as Hex);
  try {
    return privateKeyToAccount(formatted);
  } catch (err) {
    console.error("Failed to parse ORBIO_STUDIO_PRIVATE_KEY:", err);
    return null;
  }
}

// A configured key proves nothing about whether Orbio's gateway actually
// recognizes the account — it only becomes "known" once it has activated
// some CREDIT balance. Cache the real liveness check briefly so opening the
// widget repeatedly doesn't hammer the gateway.
const STATUS_CACHE_MS = 60_000;
let cachedStatus: { isLive: boolean; detail?: string } | null = null;
let cachedStatusAt = 0;

async function checkGatewayLive(apiKey: string): Promise<{ isLive: boolean; detail?: string }> {
  try {
    const res = await fetch(`${config.orbioGatewayUrl}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { isLive: true };
    if (res.status === 401) {
      return {
        isLive: false,
        detail: "Studio wallet has no activated CREDIT balance yet.",
      };
    }
    return { isLive: false, detail: `Gateway returned ${res.status}` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { isLive: false, detail: `Gateway unreachable: ${detail}` };
  }
}

export async function getConciergeStatus() {
  const account = getStudioAccount();
  if (!account) {
    return { gatewayUrl: config.orbioGatewayUrl, studioAddress: null, isLive: false };
  }

  const now = Date.now();
  if (!cachedStatus || now - cachedStatusAt > STATUS_CACHE_MS) {
    const apiKey = await getApiKey();
    cachedStatus = await checkGatewayLive(apiKey);
    cachedStatusAt = now;
  }

  return {
    gatewayUrl: config.orbioGatewayUrl,
    studioAddress: account.address,
    isLive: cachedStatus.isLive,
    detail: cachedStatus.detail,
  };
}

async function getApiKey(): Promise<string> {
  const account = getStudioAccount();
  if (!account) {
    throw new Error("Concierge is unconfigured on this node: no ORBIO_STUDIO_PRIVATE_KEY set.");
  }

  const epoch = Math.floor(Date.now() / 1000 / EPOCH_SECONDS);
  if (epoch === cachedEpoch && cachedKey) return cachedKey;

  const message = `Orbio API key · chain ${config.rhcId} · epoch ${epoch}`;
  const signature = await account.signMessage({ message });
  const key = `sk-orb-${epoch}-${Buffer.from(signature.slice(2), "hex").toString("base64")}`;

  cachedEpoch = epoch;
  cachedKey = key;
  return key;
}

export interface ConciergeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat completion request through Orbio's OpenAI-compatible gateway,
 * spending studio-held CREDIT. Used for the trust-setup concierge, heartbeat
 * reminders, and beneficiary explainers — never for anything a grantor's or
 * beneficiary's own funds pay for.
 */
export async function askConcierge(params: {
  messages: ConciergeMessage[];
  model?: string;
}): Promise<{ reply: string; raw: unknown }> {
  const apiKey = await getApiKey();
  const model = params.model || "claude-sonnet-5";

  const res = await fetch(`${config.orbioGatewayUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages: params.messages }),
  });

  const body: unknown = await res.json().catch(() => null);
  const parsed = body as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  } | null;
  if (!res.ok) {
    throw new Error(
      `Orbio gateway request failed (${res.status}): ${parsed?.error?.message || res.statusText}`,
    );
  }

  const reply = parsed?.choices?.[0]?.message?.content ?? "";
  return { reply, raw: body };
}
