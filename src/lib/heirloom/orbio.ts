/**
 * Client-side bindings for the Orbio CREDIT leg of a basket deposit.
 *
 * CREDIT never goes through a Uniswap pool — it is bought through the Orbio
 * Exchange order book instead — so it is quoted and encoded separately from
 * the SwapRouter02 legs in `swap-router.ts`, then merged back into one sealed
 * deposit submission (see `basket.mjs`'s `creditLegs` output).
 *
 * Addresses verified against robinhoodchain.blockscout.com at build time:
 * CREDIT is a verified ERC-20 ("Orbio Credit", 6 decimals) and the Exchange
 * is a verified proxy deployed by the same address as CREDIT itself.
 */
import type { Address, PublicClient } from "viem";

// Duplicated from basket.mjs's CREDIT_SYMBOL rather than imported: this repo's
// tsconfig doesn't enable allowJs/checkJs, so named exports from a plain .mjs
// module don't resolve reliably into a .ts file. Keep both literals in sync.
const CREDIT_SYMBOL = "CREDIT";

/** Same shape `quoteBasketLegs` (swap-router.ts) produces per leg. */
export interface CreditQuote {
  amountOut: bigint;
  liquid: boolean;
  tokenAddress: Address;
  decimals: number;
  routing: { type: "direct"; fee: number } | null;
}

function env(key: string): string | undefined {
  if (typeof import.meta === "undefined") return undefined;
  const value = (import.meta.env as Record<string, string | undefined>)?.[key];
  return value && value.length > 0 ? value : undefined;
}

export const CREDIT_ADDRESS = (env("VITE_CREDIT_ADDRESS") ??
  "0xe33322da1380e61e5ae5dfb21e7f62924c73004c") as Address;

export const ORBIO_EXCHANGE_ADDRESS = (env("VITE_ORBIO_EXCHANGE_ADDRESS") ??
  "0x6951ffd32630b05e06f50062aea801625a58ebc0") as Address;

/** Best-effort per the integration spec; not yet confirmed against a decoded ABI. */
export const orbioExchangeAbi = [
  {
    name: "getQuote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "usdgIn", type: "uint256" },
      { name: "maxFills", type: "uint256" },
    ],
    outputs: [{ name: "creditOut", type: "uint256" }],
  },
] as const;

/**
 * Quote a CREDIT leg the same shape `quoteBasketLegs` produces for equity
 * legs, so it can be merged straight into the same `quotes` map the basket
 * planner reads (`quotes[CREDIT_SYMBOL] = await quoteCreditLeg(...)`).
 */
export async function quoteCreditLeg(
  client: PublicClient,
  amountIn: bigint,
  maxFills = 10n,
): Promise<CreditQuote> {
  if (amountIn <= 0n) {
    return {
      amountOut: 0n,
      liquid: false,
      tokenAddress: CREDIT_ADDRESS,
      decimals: 6,
      routing: null,
    };
  }
  try {
    const amountOut = await client.readContract({
      address: ORBIO_EXCHANGE_ADDRESS,
      abi: orbioExchangeAbi,
      functionName: "getQuote",
      args: [amountIn, maxFills],
    });
    return {
      amountOut,
      liquid: amountOut > 0n,
      tokenAddress: CREDIT_ADDRESS,
      decimals: 6,
      routing: amountOut > 0n ? { type: "direct", fee: 0 } : null,
    };
  } catch {
    // Thin book or a reverting quote — same "not usable right now" treatment
    // as a dead Uniswap pool; the planner falls back instead of failing.
    return {
      amountOut: 0n,
      liquid: false,
      tokenAddress: CREDIT_ADDRESS,
      decimals: 6,
      routing: null,
    };
  }
}

export interface CreditLegPayload {
  symbol: string;
  tokenAddress: Address;
  amountIn: string;
  minOut: string;
  fee: number;
  kind: "CREDIT";
}

/**
 * Turn one of `planBasketDeposit(...).creditLegs` into the shape
 * `submitSealedDeposit` expects, merged in alongside the ordinary swap legs:
 *
 *   legs: [...basketPlan.swaps.map(...), ...basketPlan.creditLegs.map(buildCreditLegPayload)]
 */
export function buildCreditLegPayload(leg: {
  symbol: string;
  amountIn: bigint;
  minOut: bigint | null;
}): CreditLegPayload {
  if (leg.symbol !== CREDIT_SYMBOL) {
    throw new Error(`buildCreditLegPayload called on a non-CREDIT leg: ${leg.symbol}`);
  }
  return {
    symbol: CREDIT_SYMBOL,
    tokenAddress: CREDIT_ADDRESS,
    amountIn: leg.amountIn.toString(),
    minOut: (leg.minOut ?? 0n).toString(),
    fee: 0,
    kind: "CREDIT",
  };
}
