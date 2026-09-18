/**
 * Heirloom API Client
 * Connects directly to the live backend engine on Render
 */

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "https://heirloom-id5u.onrender.com";

export interface RobinhoodToken {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
  assetType: "native" | "stablecoin" | "equity" | "etf" | "commodity";
}

export interface LiveBalanceItem {
  token: RobinhoodToken;
  balanceRaw: string;
  balanceFormatted: string;
}

export interface TrustAsset {
  id: string;
  trust_id: string;
  token_address: string;
  symbol: string;
  target_allocation_bps: number;
  drip_enabled: boolean;
}

export interface TrustVestingSchedule {
  id: string;
  trust_id: string;
  unlock_timestamp: string;
  percentage_bps: number;
  claimed: boolean;
}

export interface TrustGuardian {
  id: string;
  trust_id: string;
  guardian_address: string;
  role: string;
}

export interface TrustClaim {
  id: string;
  trust_id: string;
  schedule_id: string | null;
  beneficiary_address: string;
  token_address: string;
  token_symbol: string;
  amount_atomic: string;
  amount_formatted: string;
  tx_hash: string;
  status: string;
  created_at: string;
}

export interface TrustDetail {
  id: string;
  name: string;
  grantorAddress: string;
  beneficiaryAddress: string;
  vaultIndex: number;
  vaultAddress: string;
  status: "pending_funding" | "active" | "succession_triggered" | "paused" | "completed";
  isRevocable: boolean;
  corpusFunded: boolean;
  depositTxHash: string | null;
  heartbeatWindowSeconds: number | string;
  lastHeartbeatAt: string;
  heartbeatDeadline: string;
  hasEncryptedLetter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrustResponse {
  trust: TrustDetail;
  liveBalances: LiveBalanceItem[];
  assets: TrustAsset[];
  vestingSchedules: TrustVestingSchedule[];
  guardians: TrustGuardian[];
  claims: TrustClaim[];
}

export interface CreateTrustPayload {
  name: string;
  grantorAddress: string;
  beneficiaryAddress: string;
  isRevocable?: boolean;
  heartbeatWindowSeconds?: number;
  letterToBeneficiary?: string;
  guardians?: Array<{ address: string; role?: string }>;
  assets: Array<{ symbol: string; address?: string; targetAllocationBps: number; dripEnabled?: boolean }>;
  vestingSchedules: Array<{ unlockTimestamp: string; percentageBps: number }>;
}

export interface CreateTrustResult {
  success: boolean;
  trust: TrustDetail;
  fundingInstructions: {
    depositAddress: string;
    network: string;
    chainId: number;
    acceptedTokens: Array<{ symbol: string; name: string; address: string }>;
    note: string;
  };
}

/**
 * Fetch verified Robinhood Chain tokens catalog
 */
export async function fetchTokens(): Promise<RobinhoodToken[]> {
  const res = await fetch(`${API_BASE_URL}/api/tokens`);
  if (!res.ok) throw new Error("Failed to fetch tokens catalog");
  const data = await res.json();
  return data.tokens || [];
}

/**
 * Create a new trust and receive dedicated on-chain vault address
 */
export async function createTrust(payload: CreateTrustPayload): Promise<CreateTrustResult> {
  const res = await fetch(`${API_BASE_URL}/api/trusts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || "Failed to create trust");
  }
  return data;
}

/**
 * Fetch trust details, schedules, and live on-chain balances
 */
export async function fetchTrust(trustId: string): Promise<TrustResponse> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load trust");
  }
  return data;
}

/**
 * Fetch recent public trusts on Robinhood Chain
 */
export async function fetchAllTrusts(limit = 20): Promise<TrustDetail[]> {
  const res = await fetch(`${API_BASE_URL}/api/trusts?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.trusts || [];
}

/**
 * Fetch all trusts for a grantor
 */
export async function fetchGrantorTrusts(address: string): Promise<TrustDetail[]> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/grantor/${address}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.trusts || [];
}

/**
 * Fetch all trusts for a beneficiary
 */
export async function fetchBeneficiaryTrusts(address: string): Promise<TrustDetail[]> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/beneficiary/${address}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.trusts || [];
}

/**
 * Verify on-chain funding deposit
 */
export async function verifyFunding(trustId: string, txHash?: string): Promise<{ success: boolean; status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/fund-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Funding verification failed");
  }
  return data;
}

/**
 * Submit gasless EIP-712 heartbeat check-in
 */
export async function submitHeartbeat(params: {
  trustId: string;
  grantorAddress: string;
  timestamp: number;
  message: string;
  signature: string;
}): Promise<{ success: boolean; lastHeartbeatAt: string; heartbeatDeadline: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${params.trustId}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Heartbeat submission failed");
  }
  return data;
}

/**
 * Claim vesting or succession tokens
 */
export async function claimVesting(params: {
  trustId: string;
  beneficiaryAddress: string;
  tokenSymbolOrAddress: string;
  scheduleId?: string;
}): Promise<{ success: boolean; txHash: string; amount: string; token: string; explorerUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${params.trustId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Claim payout failed");
  }
  return data;
}

/**
 * Decrypt the grantor's personal letter
 */
export async function fetchLetter(trustId: string, requesterAddress: string): Promise<{ letter: string; trustName: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/letter?requester=${requesterAddress}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to unlock letter");
  }
  return data;
}
