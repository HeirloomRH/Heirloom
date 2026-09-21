/**
 * Uniswap bindings for atomic basket deposits on Robinhood Chain.
 *
 * The grantor pays once, in native ETH, and the router fans that payment out
 * across the trust's configured allocations, delivering each output token
 * straight to the vault address rather than back to the grantor's wallet.
 *
 * Venue choice follows the model proven in Terrawallet's swap engine:
 *
 *   - Native ETH goes through **v3 SwapRouter02**, not the v4 Universal Router.
 *     v4 settles through Permit2, which has no path for a native currency, so
 *     an ETH-funded v4 swap has no verified settlement route on this chain.
 *     SwapRouter02 instead wraps `msg.value` itself and refunds the remainder.
 *   - `multicall(deadline, bytes[])` batches every leg plus the refund into one
 *     transaction, which is what makes the basket deposit atomic: one signature,
 *     one `msg.value`, all-or-nothing.
 *   - Each leg names its own `recipient`, so outputs land in the vault directly.
 *
 * Uniswap does NOT use its usual deterministic cross-chain addresses on
 * Robinhood Chain; every address below is chain-specific and verified by
 * `eth_getCode` against chain 4663.
 */
import {
  encodeFunctionData,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import type { BasketPlan, BasketRouting } from "./basket.mjs";

function env(key: string): string | undefined {
  if (typeof import.meta === "undefined") return undefined;
  const value = (import.meta.env as Record<string, string | undefined>)?.[key];
  return value && value.length > 0 ? value : undefined;
}

/** Uniswap v3 SwapRouter02. Wraps native ETH and refunds its own dust. */
export const SWAP_ROUTER_ADDRESS = (env("VITE_SWAP_ROUTER_ADDRESS") ??
  "0xcaf681a66d020601342297493863e78c959e5cb2") as Address;

/** Uniswap v3 factory — used to skip fee tiers that have no pool at all. */
export const V3_FACTORY_ADDRESS = (env("VITE_V3_FACTORY_ADDRESS") ??
  "0x1f7d7550b1b028f7571e69a784071f0205fd2efa") as Address;

/** Uniswap v3 QuoterV2. */
export const V3_QUOTER_ADDRESS = (env("VITE_V3_QUOTER_ADDRESS") ??
  "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7") as Address;

/** Canonical WETH on Robinhood Chain, from the backend token catalog. */
export const WETH_ADDRESS = (env("VITE_WETH_ADDRESS") ??
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73") as Address;

/**
 * Standard v3 fee tiers. Ordered cheapest-first only for readability — the
 * quoter picks by actual output, never by position in this list.
 */
export const V3_FEE_TIERS = [100, 500, 3000, 10000] as const;

/** Matches Uniswap's own frontend. */
export const DEFAULT_DEADLINE_SECONDS = 1200;

export const swapRouterAbi = [
  {
    name: "exactInputSingle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "multicall",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes[]" },
    ],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
  {
    name: "refundETH",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

const factoryAbi = [
  {
    name: "getPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

/**
 * QuoterV2 is not `view` — it computes by reverting and catching, so it has to
 * be reached through `simulateContract` rather than `readContract`.
 */
const quoterAbi = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export interface EncodedRouterCall {
  /** Inner `multicall` payload: one entry per leg, plus the refund. */
  calls: Hex[];
  deadline: bigint;
  /** Native value to attach: the whole deposit. */
  value: bigint;
}

/** Guard: the planner works in bigint, the ABI in uint256. */
function assertUint256(value: bigint, label: string): bigint {
  if (value < 0n) throw new Error(`${label} must not be negative`);
  if (value > (1n << 256n) - 1n) throw new Error(`${label} exceeds uint256`);
  return value;
}

/**
 * Encode a planned basket as one `multicall`.
 *
 * Every leg is an `exactInputSingle` paying WETH (which SwapRouter02 mints from
 * `msg.value`) and delivering to the vault. A trailing `refundETH` returns
 * whatever the pools did not consume, so nothing is stranded in the router.
 */
export function encodeBasketDeposit(params: {
  plan: BasketPlan;
  /** The trust's dedicated vault address; every output lands here. */
  recipient: Address;
  deadlineSeconds?: number;
}): EncodedRouterCall {
  const { plan, recipient, deadlineSeconds = DEFAULT_DEADLINE_SECONDS } = params;

  if (plan.error)
    throw new Error(`Cannot encode an invalid plan: ${plan.error}`);
  if (!plan.fullyQuoted)
    throw new Error(
      "Cannot encode a plan with unquoted legs; every leg needs a minimum output",
    );

  const calls: Hex[] = [];

  for (const swap of plan.swaps) {
    if (!swap.tokenAddress)
      throw new Error(`Missing token address for ${swap.symbol}`);
    if (swap.minOut === null)
      throw new Error(`Missing minimum output for ${swap.symbol}`);
    if (!swap.routing)
      throw new Error(`Missing pool fee tier for ${swap.symbol}`);

    calls.push(
      encodeFunctionData({
        abi: swapRouterAbi,
        functionName: "exactInputSingle",
        args: [
          {
            // SwapRouter02 wraps msg.value when tokenIn is WETH, so a native
            // deposit needs no approval and no separate wrap call.
            tokenIn: WETH_ADDRESS,
            tokenOut: swap.tokenAddress as Address,
            fee: swap.routing.fee,
            recipient,
            amountIn: assertUint256(swap.amountIn, `${swap.symbol} amountIn`),
            amountOutMinimum: assertUint256(
              swap.minOut,
              `${swap.symbol} minOut`,
            ),
            sqrtPriceLimitX96: 0n,
          },
        ],
      }),
    );
  }

  // Rounding dust and any unspent input go home, not into the router.
  calls.push(
    encodeFunctionData({ abi: swapRouterAbi, functionName: "refundETH" }),
  );

  return {
    calls,
    deadline: BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds),
    value: plan.totalWei,
  };
}

/** Ready-to-spread arguments for wagmi's `writeContract`. */
export function buildBasketDepositRequest(
  params: Parameters<typeof encodeBasketDeposit>[0],
) {
  const { calls, deadline, value } = encodeBasketDeposit(params);
  return {
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: "multicall" as const,
    args: [deadline, calls] as const,
    value,
  };
}

export interface QuoteRequestLeg {
  symbol: string;
  tokenAddress: Address;
  decimals?: number;
  amountIn: bigint;
}

export type BasketQuoteMap = Record<
  string,
  {
    amountOut: bigint;
    liquid: boolean;
    tokenAddress: Address;
    decimals?: number;
    routing: BasketRouting | null;
  }
>;

/**
 * Best direct quote for one leg, across every fee tier that has a pool.
 *
 * A deployed pool is not a usable pool: several tiers on this chain have a pool
 * contract with no depth, and those revert when quoted. So each existing tier is
 * quoted for real and the best actual output wins, rather than taking the first
 * tier that happens to have an address.
 */
async function quoteBestTier(
  client: PublicClient,
  tokenOut: Address,
  amountIn: bigint,
): Promise<{ amountOut: bigint; fee: number } | null> {
  type Tier = { amountOut: bigint; fee: number };
  const tiers = await Promise.all(
    V3_FEE_TIERS.map(async (fee): Promise<Tier | null> => {
      try {
        const pool = await client.readContract({
          address: V3_FACTORY_ADDRESS,
          abi: factoryAbi,
          functionName: "getPool",
          args: [WETH_ADDRESS, tokenOut, fee],
        });
        if (!pool || pool === zeroAddress) return null;

        const { result } = await client.simulateContract({
          address: V3_QUOTER_ADDRESS,
          abi: quoterAbi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: WETH_ADDRESS,
              tokenOut,
              amountIn,
              fee,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
        const amountOut = result[0];
        if (typeof amountOut !== "bigint" || amountOut === 0n) return null;
        return { amountOut, fee };
      } catch {
        // No pool, no depth, or a reverting quote. All mean "not usable".
        return null;
      }
    }),
  );

  const usable = tiers.filter((tier): tier is Tier => tier !== null);
  if (usable.length === 0) return null;
  return usable.reduce(
    (best, tier) => (tier.amountOut > best.amountOut ? tier : best),
    usable[0],
  );
}

/**
 * Quote every leg independently, so one dead pool costs that leg its quote and
 * nothing more — the planner then re-routes it instead of failing the basket.
 */
export async function quoteBasketLegs(
  client: PublicClient,
  legs: QuoteRequestLeg[],
): Promise<BasketQuoteMap> {
  const results = await Promise.all(
    legs.map(async (leg) => {
      if (leg.amountIn <= 0n) return null;
      const best = await quoteBestTier(client, leg.tokenAddress, leg.amountIn);
      return { leg, best };
    }),
  );

  const quotes: BasketQuoteMap = {};
  for (const entry of results) {
    if (!entry) continue;
    quotes[entry.leg.symbol] = {
      amountOut: entry.best?.amountOut ?? 0n,
      liquid: entry.best !== null,
      tokenAddress: entry.leg.tokenAddress,
      decimals: entry.leg.decimals,
      routing: entry.best ? { type: "direct", fee: entry.best.fee } : null,
    };
  }
  return quotes;
}

export type RouterUnavailableReason =
  | "router_missing"
  | "quoter_missing"
  | "probe_failed";

export interface RouterAvailability {
  available: boolean;
  reason: RouterUnavailableReason | null;
  router: Address;
}

/**
 * Confirm the venue is really there before offering to spend someone's ETH.
 *
 * Cheap insurance: a chain can carry a router deployment whose supporting
 * contracts are absent, in which case every swap reverts. Checking the router
 * and the quoter together is the difference between a clear "not available" and
 * a failed payable transaction.
 */
export async function checkRouterAvailability(
  client: PublicClient,
): Promise<RouterAvailability> {
  try {
    const [routerCode, quoterCode] = await Promise.all([
      client.getCode({ address: SWAP_ROUTER_ADDRESS }),
      client.getCode({ address: V3_QUOTER_ADDRESS }),
    ]);

    if (!routerCode || routerCode === "0x")
      return {
        available: false,
        reason: "router_missing",
        router: SWAP_ROUTER_ADDRESS,
      };

    if (!quoterCode || quoterCode === "0x")
      return {
        available: false,
        reason: "quoter_missing",
        router: SWAP_ROUTER_ADDRESS,
      };

    return { available: true, reason: null, router: SWAP_ROUTER_ADDRESS };
  } catch {
    return {
      available: false,
      reason: "probe_failed",
      router: SWAP_ROUTER_ADDRESS,
    };
  }
}
