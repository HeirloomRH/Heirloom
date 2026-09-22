import {
  createWalletClient,
  http,
  erc20Abi,
  verifyTypedData,
  getAddress,
  maxUint256,
  pad,
  type Address,
  type Hash,
} from "viem";
import { query } from "../db/index.js";
import { config } from "../config.js";
import {
  robinhoodChain,
  ROBINHOOD_DEFAULT_RPC,
  ROBINHOOD_CHAIN_ID,
} from "../lib/robinhoodTokens.js";
import { getVaultAccount } from "./vaultService.js";
import {
  publicClient,
  orbioExchangeAbi,
  computeMinCreditOut,
  USDG_ADDRESS,
  ORBIO_EXCHANGE_ADDRESS,
} from "./sealedDepositService.js";

/**
 * Default activation key when a beneficiary hasn't registered a delegated
 * one: their own wallet address, right-padded per the spec's
 * `bytes32(uint256(uint160(recipient)))` scheme.
 */
export function beneficiaryKeyFromAddress(address: Address): `0x${string}` {
  return pad(getAddress(address), { size: 32 });
}

export async function resolveBeneficiaryKey(
  trustId: string,
  beneficiaryAddress: Address,
): Promise<`0x${string}`> {
  const res = await query(
    "SELECT key_hash FROM beneficiary_keys WHERE trust_id = $1 AND beneficiary_address = $2",
    [trustId, getAddress(beneficiaryAddress)],
  );
  if (res.rows.length > 0) {
    return res.rows[0].key_hash as `0x${string}`;
  }
  return beneficiaryKeyFromAddress(beneficiaryAddress);
}

// EIP-712 domain shared with vaultService.ts's HEIRLOOM_EIP712_DOMAIN (same
// protocol, same verifying contract — kept as a separate literal here to
// avoid a circular import between the two services).
export const HEIRLOOM_EIP712_DOMAIN = {
  name: "Heirloom Trust Protocol",
  version: config.eip712DomainVersion,
  chainId: ROBINHOOD_CHAIN_ID,
  verifyingContract: getAddress(config.eip712VerifyingContract) as Address,
} as const;

export const BENEFICIARY_KEY_TYPES = {
  BeneficiaryKeyRegistration: [
    { name: "trustId", type: "string" },
    { name: "beneficiary", type: "address" },
    { name: "keyHash", type: "bytes32" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

/** Beneficiary proves ownership of their wallet before a key registration/rotation is accepted. */
export async function verifyBeneficiaryKeySignature(params: {
  trustId: string;
  beneficiaryAddress: Address;
  keyHash: `0x${string}`;
  timestamp: number;
  signature: `0x${string}`;
}): Promise<boolean> {
  try {
    return await verifyTypedData({
      address: getAddress(params.beneficiaryAddress),
      domain: HEIRLOOM_EIP712_DOMAIN,
      types: BENEFICIARY_KEY_TYPES,
      primaryType: "BeneficiaryKeyRegistration",
      message: {
        trustId: params.trustId,
        beneficiary: getAddress(params.beneficiaryAddress),
        keyHash: params.keyHash,
        timestamp: BigInt(params.timestamp),
      },
      signature: params.signature,
    });
  } catch (error) {
    console.error("Beneficiary key signature verification failed:", error);
    return false;
  }
}

export interface InferenceReleaseSchedule {
  id: string;
  trust_id: string;
  beneficiary_address: string;
  usdg_per_cycle_atomic: string;
  cadence_days: number;
  total_remaining_atomic: string;
  vault_index: number;
}

export interface RolloverInfo {
  cyclesDue: number;
  rolloverAtomic: string;
}

/**
 * A missed/deferred cycle is never lost — the worker leaves next_release_at
 * untouched until a release succeeds, so a schedule that's been stuck
 * catches up one cycle per poll once funds/liquidity are available again
 * (see inferenceReleaseWorker.ts). This is a read-only projection of that
 * behavior: how many cycles are currently owed, and how much of that is
 * "rollover" on top of the next single release, so the allowance UI can
 * show a parent/beneficiary that nothing unspent evaporates.
 */
export function computeRolloverInfo(schedule: {
  next_release_at: string | Date;
  cadence_days: number;
  usdg_per_cycle_atomic: string;
  total_remaining_atomic: string;
  active: boolean;
}): RolloverInfo {
  if (!schedule.active) return { cyclesDue: 0, rolloverAtomic: "0" };

  const nextReleaseAt = new Date(schedule.next_release_at).getTime();
  const now = Date.now();
  if (now < nextReleaseAt) return { cyclesDue: 0, rolloverAtomic: "0" };

  const cadenceMs = schedule.cadence_days * 86_400_000;
  const cyclesDue = Math.floor((now - nextReleaseAt) / cadenceMs) + 1;

  const perCycle = BigInt(schedule.usdg_per_cycle_atomic);
  const remaining = BigInt(schedule.total_remaining_atomic);
  const owed = perCycle * BigInt(cyclesDue);
  const cappedOwed = owed > remaining ? remaining : owed;
  const rollover = cappedOwed > perCycle ? cappedOwed - perCycle : 0n;

  return { cyclesDue, rolloverAtomic: rollover.toString() };
}

export type CreditGrantOutcome =
  | { status: "confirmed"; txHash: Hash; usdgSpent: bigint }
  | { status: "deferred_thin_book"; detail: string }
  | { status: "deferred_insufficient_funds"; detail: string }
  | { status: "failed"; detail: string };

/** @deprecated use CreditGrantOutcome — kept as an alias so existing imports don't break. */
export type InferenceReleaseOutcome = CreditGrantOutcome;

/**
 * Buy CREDIT with USDG straight out of a trust's own vault wallet and
 * activate it directly to a beneficiary/successor's key. No relayer hop —
 * the vault wallet (same one executeVaultPayout uses for ordinary claims)
 * signs its own approve + buyAndActivate. Shared by both the recurring
 * InferenceLeg release and the one-time succession AI grant — same
 * quote-band and balance guards either way.
 */
export async function executeCreditGrant(params: {
  vaultIndex: number;
  trustId: string;
  recipientAddress: Address;
  usdgIn: bigint;
}): Promise<CreditGrantOutcome> {
  const { vaultIndex, trustId, recipientAddress, usdgIn } = params;
  if (usdgIn <= 0n) {
    return { status: "failed", detail: "Nothing to grant" };
  }

  const account = getVaultAccount(vaultIndex);

  const vaultUsdgBalance = await publicClient.readContract({
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (vaultUsdgBalance < usdgIn) {
    return {
      status: "deferred_insufficient_funds",
      detail: `Vault holds ${vaultUsdgBalance} USDG, needs ${usdgIn}`,
    };
  }

  const maxFills = 10n;
  const quotedOut = await publicClient.readContract({
    address: ORBIO_EXCHANGE_ADDRESS,
    abi: orbioExchangeAbi,
    functionName: "getQuote",
    args: [usdgIn, maxFills],
  });
  const minCreditOut = computeMinCreditOut(usdgIn, 0n, config.orbioQuoteToleranceBps);
  if (quotedOut < minCreditOut) {
    return {
      status: "deferred_thin_book",
      detail: `Quoted ${quotedOut} CREDIT for ${usdgIn} USDG, need at least ${minCreditOut}`,
    };
  }

  const beneficiaryKey = await resolveBeneficiaryKey(trustId, getAddress(recipientAddress));

  const walletClient = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(ROBINHOOD_DEFAULT_RPC),
  });

  try {
    const currentAllowance = await publicClient.readContract({
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, ORBIO_EXCHANGE_ADDRESS],
    });
    if (currentAllowance < usdgIn) {
      const approveTx = await walletClient.writeContract({
        address: USDG_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [ORBIO_EXCHANGE_ADDRESS, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    const txHash = await walletClient.writeContract({
      address: ORBIO_EXCHANGE_ADDRESS,
      abi: orbioExchangeAbi,
      functionName: "buyAndActivate",
      args: [usdgIn, minCreditOut, beneficiaryKey, maxFills],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return { status: "failed", detail: `buyAndActivate reverted on-chain: ${txHash}` };
    }

    return { status: "confirmed", txHash, usdgSpent: usdgIn };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "failed", detail };
  }
}

/** Execute one due recurring InferenceLeg release. */
export async function executeInferenceRelease(
  schedule: InferenceReleaseSchedule,
): Promise<CreditGrantOutcome> {
  const usdgPerCycle = BigInt(schedule.usdg_per_cycle_atomic);
  const remaining = BigInt(schedule.total_remaining_atomic);
  const usdgIn = usdgPerCycle < remaining ? usdgPerCycle : remaining;

  return executeCreditGrant({
    vaultIndex: schedule.vault_index,
    trustId: schedule.trust_id,
    recipientAddress: getAddress(schedule.beneficiary_address),
    usdgIn,
  });
}

/** Execute a one-time succession AI grant to the successor's key. */
export async function executeSuccessionGrant(params: {
  vaultIndex: number;
  trustId: string;
  successorAddress: Address;
  usdgIn: bigint;
}): Promise<CreditGrantOutcome> {
  return executeCreditGrant({
    vaultIndex: params.vaultIndex,
    trustId: params.trustId,
    recipientAddress: params.successorAddress,
    usdgIn: params.usdgIn,
  });
}
