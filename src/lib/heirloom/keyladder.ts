/**
 * Client-Side KeyLadder for Heirloom Privacy Expansion (H-P)
 * Derives grantor root keys, viewing keys (vk_view), claim keys (vk_claim), and stage keys.
 * All cryptography runs client-side using standard Web Crypto API.
 */

export interface KeyLadderTree {
  grantorRootHash: string;
  trustKey: string;
  vkView: string;
  vkClaim: string;
  vkFull: string;
  stageKeys: Record<string, string>;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateGrantorRootKey(seedPhraseOrAddress: string): Promise<string> {
  return sha256(`HEIRLOOM_GRANTOR_ROOT_v1:${seedPhraseOrAddress.toLowerCase()}`);
}

export async function deriveKeyLadderTree(grantorRoot: string, trustId: string | number): Promise<KeyLadderTree> {
  const trustKey = await sha256(`HEIRLOOM_TRUST_KEY:${grantorRoot}:${trustId}`);
  const vkView = await sha256(`HEIRLOOM_VK_VIEW:${trustKey}`);
  const vkClaim = await sha256(`HEIRLOOM_VK_CLAIM:${trustKey}`);
  const vkFull = await sha256(`HEIRLOOM_VK_FULL:${trustKey}`);

  const stageKeys: Record<string, string> = {
    stage_1: await sha256(`HEIRLOOM_STAGE_1:${trustKey}`),
    stage_2: await sha256(`HEIRLOOM_STAGE_2:${trustKey}`),
    stage_3: await sha256(`HEIRLOOM_STAGE_3:${trustKey}`),
  };

  return {
    grantorRootHash: grantorRoot.slice(0, 18) + "...",
    trustKey,
    vkView,
    vkClaim,
    vkFull,
    stageKeys,
  };
}

/**
 * Encrypt client-side text (e.g. grantor letter, terms details) with a KeyLadder viewing key
 */
export async function encryptClientData(text: string, viewingKeyHex: string): Promise<string> {
  if (!text) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Derive AES-GCM key from viewingKeyHex
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(viewingKeyHex.slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("heirloom_salt_v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, "0")).join("");
  const encryptedHex = Array.from(new Uint8Array(encrypted)).map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${ivHex}:${encryptedHex}`;
}

/**
 * Decrypt client-side text with viewing key
 */
export async function decryptClientData(cipherPayload: string, viewingKeyHex: string): Promise<string> {
  if (!cipherPayload || !cipherPayload.includes(":")) return "";
  try {
    const [ivHex, encryptedHex] = cipherPayload.split(":");
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(viewingKeyHex.slice(0, 32)),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("heirloom_salt_v1"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Client-side decryption failed:", err);
    return "[Encrypted Private Terms]";
  }
}
