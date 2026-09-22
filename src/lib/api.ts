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
  assetType: "native" | "stablecoin" | "equity" | "etf" | "commodity" | "credit";
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
  status: "pending_funding" | "active" | "in_grace_period" | "succession_triggered" | "paused" | "completed";
  isRevocable: boolean;
  corpusFunded: boolean;
  depositTxHash: string | null;
  heartbeatWindowSeconds: number | string;
  lastHeartbeatAt: string;
  heartbeatDeadline: string;
  gracePeriodDeadline?: string | null;
  hasEncryptedLetter: boolean;
  telegramLinked?: boolean;
  telegramAlertsEnabled?: boolean;
  mode?: "public" | "private";
  termsHash?: string;
  cipherTerms?: string;
  cipherLetter?: string;
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
  mode?: "public" | "private";
  termsHash?: string;
  cipherTerms?: string;
  cipherLetter?: string;
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

export interface RelayerInfoResponse {
  relayerAddress: `0x${string}` | null;
  permit2Address: `0x${string}`;
  usdgAddress: `0x${string}`;
  routerAddress: `0x${string}`;
  network: string;
  chainId: number;
  isLive: boolean;
}

/**
 * Discover the active Heirloom Relayer address on Robinhood Chain
 */
export async function fetchRelayerInfo(): Promise<RelayerInfoResponse> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/relayer-info`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch relayer info");
  }
  return data;
}

export interface SealedDepositSubmission {
  permit: {
    permitted: {
      token: string;
      amount: string;
    };
    nonce: string;
    deadline: string;
  };
  signature: `0x${string}`;
  owner: string;
  legs: Array<{
    symbol: string;
    tokenAddress: string;
    amountIn: string;
    minOut: string;
    fee: number;
    // "SWAP" (default, omitted) routes through Uniswap; "CREDIT" routes
    // through the Orbio Exchange instead — see backend sealedDepositService.ts.
    kind?: "SWAP" | "CREDIT";
  }>;
  passthroughWei: string;
}

export interface SealedDepositResult {
  success: boolean;
  message: string;
  txHashes: {
    pullTxHash: `0x${string}`;
    swapTxHash?: `0x${string}`;
    transferTxHash?: `0x${string}`;
  };
  vaultAddress: string;
  corpusFunded: boolean;
}

/**
 * Submit a signed Permit2 authorization to the Heirloom Relayer for sealed execution
 */
export async function submitSealedDeposit(
  trustId: string,
  payload: SealedDepositSubmission
): Promise<SealedDepositResult> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/sealed-deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.details || data.error || "Sealed basket deposit failed");
  }
  return data;
}

export interface InferenceSchedule {
  id: string;
  trust_id: string;
  beneficiary_address: string;
  usdg_per_cycle_atomic: string;
  cadence_days: number;
  next_release_at: string;
  total_remaining_atomic: string;
  active: boolean;
  created_at: string;
  /** Guardian allowance controls: a missed cycle isn't lost, it accrues here. */
  rollover: { cyclesDue: number; rolloverAtomic: string };
}

export interface InferenceRelease {
  id: string;
  trust_id: string;
  schedule_id: string | null;
  beneficiary_address: string;
  usdg_spent_atomic: string;
  tx_hash: string | null;
  status: string;
  detail: string | null;
  created_at: string;
}

/**
 * Grantor configures a recurring CREDIT allowance: usdgPerCycle spent every
 * cadenceDays, activated straight to the beneficiary's Orbio key, no claim
 * required.
 */
export async function configureInferenceAllowance(
  trustId: string,
  payload: {
    grantorAddress: string;
    usdgPerCycle: string;
    cadenceDays: number;
    totalUsdg: string;
    beneficiaryAddress?: string;
  },
): Promise<{ success: boolean; scheduleId: string; nextReleaseAt: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/legs/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to configure inference allowance");
  }
  return data;
}

/**
 * List configured CREDIT allowances and their release history for a trust.
 */
export async function fetchInferenceAllowances(
  trustId: string,
): Promise<{ schedules: InferenceSchedule[]; releases: InferenceRelease[] }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/legs/inference`);
  if (!res.ok) return { schedules: [], releases: [] };
  const data = await res.json();
  return { schedules: data.schedules || [], releases: data.releases || [] };
}

export interface StakeEvent {
  id: string;
  trust_id: string;
  kind: "stake" | "unstake" | "claim";
  amount_atomic: string;
  tx_hash: string | null;
  status: string;
  detail: string | null;
  created_at: string;
}

export interface StakeStatus {
  stakedAtomic: string;
  minPositionAtomic: string;
  active: boolean;
  lastClaimAt: string | null;
  events: StakeEvent[];
}

/** Live staked ORBIO position plus claim/stake/unstake history for a trust. */
export async function fetchStakeStatus(trustId: string): Promise<StakeStatus | null> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/stake`);
  if (!res.ok) return null;
  return res.json();
}

/** Grantor stakes ORBIO already sitting in the trust's vault. */
export async function stakeOrbio(
  trustId: string,
  payload: { grantorAddress: string; amountOrbio: string },
): Promise<{ success: boolean; txHash: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/stake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to stake ORBIO");
  }
  return data;
}

/** Grantor unstakes ORBIO back into the trust's vault. */
export async function unstakeOrbio(
  trustId: string,
  payload: { grantorAddress: string; amountOrbio: string },
): Promise<{ success: boolean; txHash: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/unstake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to unstake ORBIO");
  }
  return data;
}

export interface SuccessionAiGrant {
  id: string;
  trust_id: string;
  successor_address: string;
  usdg_spent_atomic: string;
  tx_hash: string | null;
  status: string;
  detail: string | null;
  created_at: string;
}

export interface SuccessionAiBudgetStatus {
  budgetUsdgAtomic: string | null;
  grantedAt: string | null;
  grants: SuccessionAiGrant[];
}

/** Live succession AI budget config + grant history for a trust. */
export async function fetchSuccessionAiBudget(
  trustId: string,
): Promise<SuccessionAiBudgetStatus | null> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/succession-ai-budget`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Grantor configures a one-time USDG budget that gets activated as CREDIT to
 * the successor's key the moment succession triggers. Can only be set once
 * — the route refuses changes after it's already been granted.
 */
export async function configureSuccessionAiBudget(
  trustId: string,
  payload: { grantorAddress: string; budgetUsdg: string },
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/succession-ai-budget`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to configure succession AI budget");
  }
  return data;
}

export interface TelegramPairingResponse {
  success: boolean;
  pairingToken: string;
  startLink: string;
  botUsername: string;
  expiresInSeconds: number;
}

/**
 * Generate a one-time Telegram pairing token and deep-link for this trust
 */
export async function createTelegramPairing(
  trustId: string,
  grantorAddress?: string
): Promise<TelegramPairingResponse> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/telegram-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantorAddress }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate Telegram pairing link");
  }
  return data;
}

/**
 * Disconnect Telegram alerts from this trust
 */
export async function unlinkTelegram(trustId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/trusts/${trustId}/telegram-link`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to disconnect Telegram");
  }
  return data;
}

export interface ConciergeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ConciergeStatus {
  gatewayUrl: string;
  studioAddress: string | null;
  isLive: boolean;
  detail?: string;
}

/** Whether Heirloom's Orbio-funded concierge is configured and reachable on this node. */
export async function fetchConciergeStatus(): Promise<ConciergeStatus> {
  const res = await fetch(`${API_BASE_URL}/api/concierge/status`);
  if (!res.ok) return { gatewayUrl: "", studioAddress: null, isLive: false };
  return res.json();
}

/**
 * Ask Heirloom's setup/heartbeat/beneficiary concierge a question. Runs on
 * Orbio inference paid for with studio-held CREDIT, never the caller's own
 * funds.
 */
export async function askConcierge(messages: ConciergeMessage[]): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/concierge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Concierge request failed");
  }
  return data.reply as string;
}
