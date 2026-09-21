export declare const BPS_DENOMINATOR: bigint;

export declare const ROUTE_PASSTHROUGH: "passthrough";
export declare const ROUTE_SWAP: "swap";
export declare const ROUTE_FALLBACK: "fallback";

export type BasketRoute = "passthrough" | "swap" | "fallback";

/** "" when valid; otherwise a stable code resolved against the locale dictionary. */
export type SlippageError =
  | ""
  | "slippage_invalid"
  | "slippage_too_low"
  | "slippage_too_high";

export type BasketError =
  | ""
  | SlippageError
  | "basket_empty"
  | "basket_allocation_positive"
  | "basket_allocation_total"
  | "basket_duplicate_symbol"
  | "basket_amount_positive";

export interface BasketLegInput {
  symbol: string;
  bps: number;
  tokenAddress?: string;
  decimals?: number;
}

/** Which pool a leg was quoted against. */
export interface BasketRouting {
  type: "direct";
  /** v3 fee tier in hundredths of a bip: 100, 500, 3000 or 10000. */
  fee: number;
}

export interface BasketQuote {
  amountOut: bigint | string | number;
  /** Explicit `false` marks a pool that exists but cannot fill the leg. */
  liquid?: boolean;
  tokenAddress?: string;
  decimals?: number;
  routing?: BasketRouting | null;
}

export interface PlannedLeg {
  symbol: string;
  bps: number;
  tokenAddress?: string;
  decimals?: number;
  amountIn: bigint;
  route: BasketRoute;
  /** `null` when no quote was available for this leg. */
  quotedOut: bigint | null;
  minOut: bigint | null;
  fallbackSymbol: string | null;
}

export interface PlannedSwap {
  symbol: string;
  tokenAddress?: string;
  decimals?: number;
  amountIn: bigint;
  /** `null` whenever the swap carries re-routed legs and must be re-quoted. */
  minOut: bigint | null;
  /** `null` until the leg has a real quote naming its pool. */
  routing: BasketRouting | null;
  merged: boolean;
}

export interface BasketPlan {
  error: BasketError;
  inputSymbol: string;
  fallbackSymbol: string;
  slippageBps: number;
  totalWei: bigint;
  legs: PlannedLeg[];
  swaps: PlannedSwap[];
  passthroughWei: bigint;
  routedWei: bigint;
  hasFallback: boolean;
  fullyQuoted: boolean;
}

/** Failed plans carry the code and nothing else worth reading. */
export type BasketPlanResult =
  | BasketPlan
  | { error: Exclude<BasketError, "">; legs: []; swaps: [] };

export declare function splitAmountByBps(
  totalWei: bigint | string | number,
  legs: { bps: number }[],
): bigint[];

export declare function applySlippage(
  amountOut: bigint | string | number,
  slippageBps: number,
): bigint;

export declare function validateSlippageBps(slippageBps: number): SlippageError;

export declare function validateBasketLegs(legs: BasketLegInput[]): BasketError;

export declare function planBasketDeposit(params: {
  totalWei: bigint | string | number;
  legs: BasketLegInput[];
  quotes?: Record<string, BasketQuote>;
  slippageBps?: number;
  inputSymbol?: string;
  fallbackSymbol?: string;
}): BasketPlanResult;
