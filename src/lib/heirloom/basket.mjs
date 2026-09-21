// Basket deposit planning.
//
// Every amount here is a BigInt of base units so the split the grantor is shown
// is bit-for-bit the split that ends up in the calldata they sign. Percentages
// are basis points (1% = 100 bps) to match `trust_assets.target_allocation_bps`.
//
// Like the other validators in this folder, planning failures come back as a
// stable CODE rather than a sentence, so the message can be rendered in the
// reader's language.

export const BPS_DENOMINATOR = 10000n;

/** Router leg outcomes, in the order the UI prefers to show them. */
export const ROUTE_PASSTHROUGH = "passthrough";
export const ROUTE_SWAP = "swap";
export const ROUTE_CREDIT = "credit";
export const ROUTE_FALLBACK = "fallback";

/**
 * Symbol reserved for the Orbio CREDIT leg. A leg with this symbol never
 * touches a Uniswap pool — it routes through the Orbio Exchange instead, so
 * it is planned separately from ordinary equity legs.
 */
export const CREDIT_SYMBOL = "CREDIT";

/**
 * Split `totalWei` across `legs` by basis points, losing nothing to rounding.
 *
 * Plain floor division strands up to `legs.length - 1` base units in the router,
 * so the shortfall is handed out one unit at a time to whichever legs were
 * truncated hardest (largest-remainder). Ties go to the earlier leg, which keeps
 * the result stable for a given input order.
 */
export function splitAmountByBps(totalWei, legs) {
  const total = BigInt(totalWei);
  const parts = legs.map((leg, index) => {
    const scaled = total * BigInt(leg.bps);
    return {
      index,
      amount: scaled / BPS_DENOMINATOR,
      remainder: scaled % BPS_DENOMINATOR,
    };
  });

  let assigned = parts.reduce((sum, part) => sum + part.amount, 0n);
  const ranked = [...parts].sort(
    (a, b) =>
      (b.remainder > a.remainder ? 1 : b.remainder < a.remainder ? -1 : 0) || a.index - b.index,
  );

  for (let i = 0; assigned < total; i++) {
    ranked[i % ranked.length].amount += 1n;
    assigned += 1n;
  }

  return parts.map((part) => part.amount);
}

/** Minimum acceptable output after slippage tolerance, rounded down. */
export function applySlippage(amountOut, slippageBps) {
  const out = BigInt(amountOut);
  if (out <= 0n) return 0n;
  return (out * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
}

/** "" when valid, otherwise a code. Ceiling matches the router's own guard. */
export function validateSlippageBps(slippageBps) {
  if (!Number.isInteger(slippageBps)) return "slippage_invalid";
  if (slippageBps < 1) return "slippage_too_low";
  if (slippageBps > 5000) return "slippage_too_high";
  return "";
}

/** "" when the legs can be routed at all. */
export function validateBasketLegs(legs) {
  if (!Array.isArray(legs) || legs.length === 0) return "basket_empty";
  if (legs.some((leg) => !Number.isInteger(leg.bps) || leg.bps <= 0))
    return "basket_allocation_positive";
  if (legs.reduce((sum, leg) => sum + leg.bps, 0) !== 10000) return "basket_allocation_total";
  const symbols = legs.map((leg) => leg.symbol);
  if (new Set(symbols).size !== symbols.length) return "basket_duplicate_symbol";
  return "";
}

/**
 * Turn an input amount plus a trust's target allocations into an executable
 * plan: one entry per configured asset, each with the exact amount of input it
 * consumes and the minimum output that must land in the vault.
 *
 * A leg whose quote is missing or illiquid is not allowed to revert the whole
 * deposit — it is re-routed into the fallback currency, and the legs that share
 * that fate are merged into a single swap so the calldata stays compact.
 *
 * @param {object} params
 * @param {bigint|string|number} params.totalWei  Input amount, base units.
 * @param {{symbol: string, bps: number, tokenAddress?: string, decimals?: number}[]} params.legs
 * @param {Record<string, {amountOut: bigint|string|number, liquid?: boolean}>} [params.quotes]
 *   Keyed by leg symbol. A missing key means "no quote available".
 * @param {number} [params.slippageBps]     Defaults to 100 (1.0%), per spec.
 * @param {string} [params.inputSymbol]     Symbol being paid in, e.g. "ETH".
 * @param {string} [params.fallbackSymbol]  Where illiquid legs land. "USDG".
 */
export function planBasketDeposit({
  totalWei,
  legs,
  quotes = {},
  slippageBps = 100,
  inputSymbol = "ETH",
  fallbackSymbol = "USDG",
}) {
  const legError = validateBasketLegs(legs);
  if (legError) return { error: legError, legs: [], swaps: [] };

  const slippageError = validateSlippageBps(slippageBps);
  if (slippageError) return { error: slippageError, legs: [], swaps: [] };

  const total = BigInt(totalWei);
  if (total <= 0n) return { error: "basket_amount_positive", legs: [], swaps: [] };

  const amounts = splitAmountByBps(total, legs);

  // A leg only needs the router if it is actually changing currency.
  const planned = legs.map((leg, i) => {
    const amountIn = amounts[i];
    const quote = quotes[leg.symbol];
    const quotedOut = quote && quote.liquid !== false ? BigInt(quote.amountOut) : null;

    let route = ROUTE_SWAP;
    if (leg.symbol === CREDIT_SYMBOL) route = ROUTE_CREDIT;
    else if (leg.symbol === inputSymbol) route = ROUTE_PASSTHROUGH;
    else if (quotedOut === null || quotedOut <= 0n) route = ROUTE_FALLBACK;

    return {
      symbol: leg.symbol,
      bps: leg.bps,
      tokenAddress: leg.tokenAddress,
      decimals: leg.decimals,
      amountIn,
      route,
      // A passthrough moves the input asset itself, so out === in.
      // If a leg falls back to the input currency, it also retains out === in without pool execution.
      quotedOut:
        route === ROUTE_PASSTHROUGH || (route === ROUTE_FALLBACK && fallbackSymbol === inputSymbol)
          ? amountIn
          : quotedOut,
      minOut:
        route === ROUTE_PASSTHROUGH || (route === ROUTE_FALLBACK && fallbackSymbol === inputSymbol)
          ? amountIn
          : quotedOut === null
            ? null
            : applySlippage(quotedOut, slippageBps),
      // Set below for legs that had to be re-routed.
      fallbackSymbol: route === ROUTE_FALLBACK ? fallbackSymbol : null,
    };
  });

  // Build the swap set the router will execute: one per liquid leg, plus at most
  // one merged swap carrying everything that fell back.
  const swaps = [];
  for (const leg of planned) {
    if (leg.route !== ROUTE_SWAP) continue;
    swaps.push({
      symbol: leg.symbol,
      tokenAddress: leg.tokenAddress,
      decimals: leg.decimals,
      amountIn: leg.amountIn,
      minOut: leg.minOut,
      // Which pool the quote came from; the encoder needs the fee tier.
      routing: quotes[leg.symbol]?.routing ?? null,
      merged: false,
    });
  }

  // CREDIT never goes through a Uniswap pool, so it is kept out of `swaps`
  // (the Uniswap multicall input) and reported separately for the Orbio leg.
  const creditLegs = planned
    .filter((leg) => leg.route === ROUTE_CREDIT)
    .map((leg) => ({
      symbol: leg.symbol,
      amountIn: leg.amountIn,
      minOut: leg.minOut,
    }));

  const fallbackLegs = planned.filter((leg) => leg.route === ROUTE_FALLBACK);
  if (fallbackLegs.length > 0 && fallbackSymbol !== inputSymbol) {
    const amountIn = fallbackLegs.reduce((sum, leg) => sum + leg.amountIn, 0n);
    const existing = swaps.find((swap) => swap.symbol === fallbackSymbol);
    const fallbackQuote = quotes[fallbackSymbol];
    if (existing) {
      // The basket already buys the fallback currency; widen that swap instead
      // of emitting a second one against the same pool.
      existing.amountIn += amountIn;
      existing.minOut = null;
      existing.merged = true;
    } else {
      swaps.push({
        symbol: fallbackSymbol,
        tokenAddress: fallbackQuote?.tokenAddress,
        decimals: fallbackQuote?.decimals,
        amountIn,
        minOut: null,
        routing: fallbackQuote?.routing ?? null,
        merged: true,
      });
    }
  }

  const passthrough = planned
    .filter(
      (leg) =>
        leg.route === ROUTE_PASSTHROUGH ||
        (leg.route === ROUTE_FALLBACK && leg.fallbackSymbol === inputSymbol),
    )
    .reduce((sum, leg) => sum + leg.amountIn, 0n);

  return {
    error: "",
    inputSymbol,
    fallbackSymbol,
    slippageBps,
    totalWei: total,
    legs: planned,
    swaps,
    creditLegs,
    // Input that never touches a pool and is transferred to the vault as-is.
    passthroughWei: passthrough,
    routedWei: swaps.reduce((sum, swap) => sum + swap.amountIn, 0n),
    hasFallback: fallbackLegs.length > 0,
    // True once every leg has a real quote, i.e. the plan is safe to execute.
    fullyQuoted: planned.every((leg) => leg.minOut !== null),
  };
}
