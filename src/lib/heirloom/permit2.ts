import {
  maxUint256,
  erc20Abi,
  type Address,
  type Hex,
} from "viem";
import { USDG_ADDRESS } from "./swap-router";
import { ROBINHOOD_CHAIN_ID } from "../chain";

function env(key: string): string | undefined {
  if (typeof import.meta === "undefined") return undefined;
  const value = (import.meta.env as Record<string, string | undefined>)?.[key];
  return value && value.length > 0 ? value : undefined;
}

/**
 * Canonical Uniswap Permit2 address.
 * Verified deployed on Robinhood Chain (Chain ID: 4663).
 */
export const PERMIT2_ADDRESS = (env("VITE_PERMIT2_ADDRESS") ??
  "0x000000000022D473030F116dDEE9F6B43aC78BA3") as Address;

export const PERMIT2_DOMAIN = {
  name: "Permit2",
  chainId: ROBINHOOD_CHAIN_ID,
  verifyingContract: PERMIT2_ADDRESS,
} as const;

export const PERMIT2_TYPES = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

/**
 * Generates a unique 256-bit nonce for Permit2 single transfers
 */
export function generatePermit2Nonce(): bigint {
  const now = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1_000_000));
  return (now << 20n) | rand;
}

/**
 * Build ready-to-spread writeContract arguments for approving USDG spending on Permit2.
 */
export function buildPermit2ApprovalRequest(amount: bigint = maxUint256) {
  return {
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "approve" as const,
    args: [PERMIT2_ADDRESS, amount] as const,
  };
}

export interface Permit2Message {
  permitted: {
    token: Address;
    amount: bigint;
  };
  spender: Address;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Formats typed data parameters for wagmi signTypedDataAsync
 */
export function buildPermit2TypedData(params: {
  amount: bigint;
  spender: Address;
  token?: Address;
  nonce?: bigint;
  deadlineSeconds?: number;
}) {
  const token = params.token ?? USDG_ADDRESS;
  const nonce = params.nonce ?? generatePermit2Nonce();
  const deadline = BigInt(
    Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? 1800)
  );

  const message: Permit2Message = {
    permitted: {
      token,
      amount: params.amount,
    },
    spender: params.spender,
    nonce,
    deadline,
  };

  return {
    domain: PERMIT2_DOMAIN,
    types: PERMIT2_TYPES,
    primaryType: "PermitTransferFrom" as const,
    message,
    nonce,
    deadline,
  };
}
