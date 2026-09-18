import crypto from "node:crypto";
import {
  createWalletClient,
  createPublicClient,
  http,
  erc20Abi,
  verifyTypedData,
  getAddress,
  type Hash,
  type Address,
} from "viem";
import { mnemonicToAccount, type HDAccount } from "viem/accounts";
import { config } from "../config.js";
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_DEFAULT_RPC,
  fetchWalletBalances,
  robinhoodChain,
  type RobinhoodTokenInfo,
} from "../lib/robinhoodTokens.js";

// Viem public client
export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(ROBINHOOD_DEFAULT_RPC),
});

/**
 * Deterministically derives an isolated HD account for a given trust index
 * Derivation path: m/44'/60'/0'/0/{index}
 */
export function getVaultAccount(index: number): HDAccount {
  return mnemonicToAccount(config.vaultMasterMnemonic, {
    addressIndex: index,
  });
}

/**
 * Returns the public address for a given vault index
 */
export function getVaultAddress(index: number): `0x${string}` {
  const account = getVaultAccount(index);
  return account.address;
}

/**
 * AES-256-GCM Encryption for sensitive metadata & beneficiary letters
 */
export function encryptText(plainText: string): string {
  if (!plainText) return "";
  const key = Buffer.from(config.encryptionKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * AES-256-GCM Decryption
 */
export function decryptText(cipherData: string): string {
  if (!cipherData) return "";
  try {
    const [ivHex, tagHex, encryptedHex] = cipherData.split(":");
    if (!ivHex || !tagHex || !encryptedHex) return "";

    const key = Buffer.from(config.encryptionKey, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return "[Decryption Error]";
  }
}

/**
 * Live balances for a dedicated vault index
 */
export async function getVaultLiveBalances(vaultIndex: number) {
  const address = getVaultAddress(vaultIndex);
  const balances = await fetchWalletBalances(address);
  return {
    vaultIndex,
    vaultAddress: address,
    balances,
  };
}

/**
 * Dispatch a token payout from the dedicated vault to the beneficiary
 */
export async function executeVaultPayout(params: {
  vaultIndex: number;
  tokenAddress: `0x${string}`;
  beneficiaryAddress: `0x${string}`;
  amountAtomic: bigint;
  isNativeEth?: boolean;
}): Promise<Hash> {
  const account = getVaultAccount(params.vaultIndex);
  
  const walletClient = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(ROBINHOOD_DEFAULT_RPC),
  });

  if (params.isNativeEth || params.tokenAddress === "0x0000000000000000000000000000000000000000") {
    // Send Native ETH
    const hash = await walletClient.sendTransaction({
      to: params.beneficiaryAddress,
      value: params.amountAtomic,
    });
    return hash;
  }

  // Send ERC-20 Token (e.g. SPCX, USDG, AAPL)
  const hash = await walletClient.writeContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.beneficiaryAddress, params.amountAtomic],
  });

  return hash;
}

/**
 * EIP-712 Typed Data Domain for Heirloom Heartbeats & Guardian Attestations
 */
export const HEIRLOOM_EIP712_DOMAIN = {
  name: "Heirloom Trust Protocol",
  version: "1",
  chainId: ROBINHOOD_CHAIN_ID,
  verifyingContract: "0x0000000000000000000000000000000000000000" as Address,
} as const;

export const HEARTBEAT_TYPES = {
  Heartbeat: [
    { name: "trustId", type: "string" },
    { name: "grantor", type: "address" },
    { name: "timestamp", type: "uint256" },
    { name: "message", type: "string" },
  ],
} as const;

/**
 * Verify off-chain gasless heartbeat signature from the Grantor
 */
export async function verifyHeartbeatSignature(params: {
  trustId: string;
  grantorAddress: `0x${string}`;
  timestamp: number;
  message: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  try {
    const isValid = await verifyTypedData({
      address: getAddress(params.grantorAddress),
      domain: HEIRLOOM_EIP712_DOMAIN,
      types: HEARTBEAT_TYPES,
      primaryType: "Heartbeat",
      message: {
        trustId: params.trustId,
        grantor: getAddress(params.grantorAddress),
        timestamp: BigInt(params.timestamp),
        message: params.message,
      },
      signature: params.signature,
    });

    return isValid;
  } catch (error) {
    console.error("Heartbeat signature verification failed:", error);
    return false;
  }
}
