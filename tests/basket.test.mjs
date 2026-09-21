import test from "node:test";
import assert from "node:assert/strict";
import {
  splitAmountByBps,
  applySlippage,
  validateSlippageBps,
  validateBasketLegs,
  planBasketDeposit,
  CREDIT_SYMBOL,
} from "../src/lib/heirloom/basket.mjs";

const ONE_ETH = 10n ** 18n;
// The sample trust in src/lib/heirloom/vault.ts: 40 / 35 / 25.
const SAMPLE_LEGS = [
  { symbol: "SPCX", bps: 4000, tokenAddress: "0x4a0E", decimals: 18 },
  { symbol: "AAPL", bps: 3500, tokenAddress: "0xaF3D", decimals: 18 },
  { symbol: "USDG", bps: 2500, tokenAddress: "0x5fc5", decimals: 6 },
];

const liquidQuotes = {
  SPCX: { amountOut: 1000n },
  AAPL: { amountOut: 2000n },
  USDG: { amountOut: 3000n },
};

test("split is exact: the legs always re-add to the input, never leaving dust", () => {
  // Amounts chosen to force truncation on every leg.
  for (const total of [
    ONE_ETH,
    1n,
    2n,
    3n,
    7n,
    9999n,
    10001n,
    123456789n,
    ONE_ETH / 3n,
    2n ** 90n + 7n,
  ]) {
    const parts = splitAmountByBps(total, SAMPLE_LEGS);
    assert.equal(
      parts.reduce((a, b) => a + b, 0n),
      total,
      `legs must sum to ${total}`,
    );
    assert.ok(parts.every((p) => p >= 0n));
  }
});

test("split hands the rounding shortfall to the most-truncated legs first", () => {
  // 1 wei over three legs: 4000/3500/2500 bps all truncate to 0, so the
  // remainders 4000 > 3500 > 2500 decide the order and SPCX takes the unit.
  assert.deepEqual(splitAmountByBps(1n, SAMPLE_LEGS), [1n, 0n, 0n]);
  assert.deepEqual(splitAmountByBps(2n, SAMPLE_LEGS), [1n, 1n, 0n]);
  assert.deepEqual(splitAmountByBps(3n, SAMPLE_LEGS), [1n, 1n, 1n]);
});

test("split is stable for equal weights and ties break toward the earlier leg", () => {
  const thirds = [
    { symbol: "A", bps: 3334 },
    { symbol: "B", bps: 3333 },
    { symbol: "C", bps: 3333 },
  ];
  assert.equal(
    splitAmountByBps(100n, thirds).reduce((a, b) => a + b, 0n),
    100n,
  );
  const halves = [
    { symbol: "A", bps: 5000 },
    { symbol: "B", bps: 5000 },
  ];
  assert.deepEqual(splitAmountByBps(1n, halves), [1n, 0n]);
  assert.deepEqual(splitAmountByBps(ONE_ETH, halves), [ONE_ETH / 2n, ONE_ETH / 2n]);
});

test("split matches the exact weights when no truncation is needed", () => {
  assert.deepEqual(splitAmountByBps(ONE_ETH, SAMPLE_LEGS), [
    (ONE_ETH * 4000n) / 10000n,
    (ONE_ETH * 3500n) / 10000n,
    (ONE_ETH * 2500n) / 10000n,
  ]);
});

test("slippage floors the minimum out and never returns more than quoted", () => {
  assert.equal(applySlippage(1000n, 100), 990n); // 1.0%
  assert.equal(applySlippage(1000n, 50), 995n); // 0.5%
  assert.equal(applySlippage(10n, 1), 9n); // rounds down, not up
  assert.equal(applySlippage(0n, 100), 0n);
  assert.equal(applySlippage(ONE_ETH, 10000), 0n);
});

test("slippage tolerance is bounded", () => {
  assert.equal(validateSlippageBps(100), "");
  assert.equal(validateSlippageBps(1), "");
  assert.equal(validateSlippageBps(5000), "");
  assert.equal(validateSlippageBps(0), "slippage_too_low");
  assert.equal(validateSlippageBps(-1), "slippage_too_low");
  assert.equal(validateSlippageBps(5001), "slippage_too_high");
  assert.equal(validateSlippageBps(1.5), "slippage_invalid");
  assert.equal(validateSlippageBps(NaN), "slippage_invalid");
});

test("leg validation mirrors the trust allocation rules", () => {
  assert.equal(validateBasketLegs(SAMPLE_LEGS), "");
  assert.equal(validateBasketLegs([]), "basket_empty");
  assert.equal(validateBasketLegs([{ symbol: "A", bps: 5000 }]), "basket_allocation_total");
  assert.equal(
    validateBasketLegs([
      { symbol: "A", bps: 0 },
      { symbol: "B", bps: 10000 },
    ]),
    "basket_allocation_positive",
  );
  assert.equal(
    validateBasketLegs([
      { symbol: "A", bps: 5000 },
      { symbol: "A", bps: 5000 },
    ]),
    "basket_duplicate_symbol",
  );
});

test("a fully quoted plan routes every leg and conserves the input", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH / 2n, // 0.5 ETH, the example in the spec
    legs: SAMPLE_LEGS,
    quotes: liquidQuotes,
    slippageBps: 100,
  });

  assert.equal(plan.error, "");
  assert.equal(plan.fullyQuoted, true);
  assert.equal(plan.hasFallback, false);
  assert.equal(plan.legs.length, 3);
  assert.equal(plan.swaps.length, 3);
  assert.equal(
    plan.legs.reduce((sum, leg) => sum + leg.amountIn, 0n),
    ONE_ETH / 2n,
  );
  assert.equal(plan.passthroughWei + plan.routedWei, plan.totalWei);
  assert.deepEqual(
    plan.legs.map((l) => l.route),
    ["swap", "swap", "swap"],
  );
  assert.equal(plan.legs[0].minOut, 990n);
});

test("paying in an asset the basket already holds skips the pool for that leg", () => {
  const plan = planBasketDeposit({
    totalWei: 1_000_000n,
    legs: SAMPLE_LEGS,
    quotes: liquidQuotes,
    inputSymbol: "USDG",
  });

  const usdg = plan.legs.find((l) => l.symbol === "USDG");
  assert.equal(usdg.route, "passthrough");
  // A passthrough cannot lose value, so min-out is the full amount.
  assert.equal(usdg.minOut, usdg.amountIn);
  assert.equal(plan.passthroughWei, 250_000n);
  assert.equal(plan.routedWei, 750_000n);
  assert.equal(
    plan.swaps.some((s) => s.symbol === "USDG"),
    false,
  );
});

test("an illiquid leg falls back to USDG instead of reverting the deposit", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: [
      { symbol: "SPCX", bps: 4000 },
      { symbol: "AAPL", bps: 3500 },
      { symbol: "NVDA", bps: 2500 },
    ],
    quotes: {
      SPCX: { amountOut: 1000n },
      AAPL: { amountOut: 2000n },
      // The NVDA pool exists but cannot fill this size.
      NVDA: { amountOut: 0n, liquid: false },
      USDG: { amountOut: 5n, tokenAddress: "0x5fc5", decimals: 6 },
    },
    fallbackSymbol: "USDG",
  });

  assert.equal(plan.error, "");
  assert.equal(plan.hasFallback, true);
  // The deposit is still whole: nothing was dropped.
  assert.equal(plan.routedWei, ONE_ETH);

  const nvda = plan.legs.find((l) => l.symbol === "NVDA");
  assert.equal(nvda.route, "fallback");
  assert.equal(nvda.fallbackSymbol, "USDG");
  assert.equal(nvda.minOut, null);

  const usdgSwap = plan.swaps.find((s) => s.symbol === "USDG");
  assert.ok(usdgSwap, "a fallback swap must be emitted");
  assert.equal(usdgSwap.merged, true);
  assert.equal(usdgSwap.amountIn, (ONE_ETH * 2500n) / 10000n);
  assert.equal(usdgSwap.decimals, 6);
  // An unquoted swap must never be executed on a stale minimum.
  assert.equal(usdgSwap.minOut, null);
  assert.equal(plan.fullyQuoted, false);
});

test("fallback merges into the existing leg when the basket already buys USDG", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: SAMPLE_LEGS,
    quotes: {
      SPCX: { amountOut: 0n, liquid: false },
      AAPL: { amountOut: 2000n },
      USDG: { amountOut: 3000n },
    },
  });

  // One swap fewer than legs: SPCX was folded into the USDG swap.
  assert.equal(plan.swaps.length, 2);
  const usdgSwap = plan.swaps.find((s) => s.symbol === "USDG");
  assert.equal(usdgSwap.merged, true);
  assert.equal(usdgSwap.amountIn, (ONE_ETH * 6500n) / 10000n);
  assert.equal(plan.routedWei, ONE_ETH);
});

test("missing quotes leave the plan unexecutable rather than guessing", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: SAMPLE_LEGS,
    quotes: {},
  });

  assert.equal(plan.error, "");
  assert.equal(plan.fullyQuoted, false);
  assert.ok(plan.legs.every((l) => l.route === "fallback"));
  assert.ok(plan.legs.every((l) => l.minOut === null));
  // Still conserves the deposit, so the UI can show the ETH split.
  assert.equal(plan.routedWei, ONE_ETH);
});

test("bad inputs are refused with a code, not a thrown error", () => {
  assert.equal(
    planBasketDeposit({ totalWei: 0n, legs: SAMPLE_LEGS }).error,
    "basket_amount_positive",
  );
  assert.equal(
    planBasketDeposit({ totalWei: -5n, legs: SAMPLE_LEGS }).error,
    "basket_amount_positive",
  );
  assert.equal(planBasketDeposit({ totalWei: ONE_ETH, legs: [] }).error, "basket_empty");
  assert.equal(
    planBasketDeposit({
      totalWei: ONE_ETH,
      legs: SAMPLE_LEGS,
      slippageBps: 9999,
    }).error,
    "slippage_too_high",
  );
});

test("USDG input splits cleanly in 6 decimals and marks USDG leg as passthrough", () => {
  const FIVE_HUNDRED_USDG = 500_000_000n; // 500 USDG (6 decimals)
  const plan = planBasketDeposit({
    totalWei: FIVE_HUNDRED_USDG,
    legs: SAMPLE_LEGS, // 40% SPCX, 35% AAPL, 25% USDG
    quotes: {
      SPCX: { amountOut: 10_000_000_000_000_000_000n }, // 10 SPCX
      AAPL: { amountOut: 1_000_000_000_000_000_000n }, // 1 AAPL
      USDG: { amountOut: 125_000_000n }, // 125 USDG
    },
    slippageBps: 100,
    inputSymbol: "USDG",
    fallbackSymbol: "USDG",
  });

  assert.equal(plan.error, "");
  assert.equal(plan.inputSymbol, "USDG");
  assert.equal(plan.totalWei, FIVE_HUNDRED_USDG);
  assert.equal(plan.passthroughWei, 125_000_000n); // 25% of 500
  assert.equal(plan.routedWei, 375_000_000n); // 75% of 500

  // 2 swaps (SPCX and AAPL), 1 passthrough (USDG)
  assert.equal(plan.swaps.length, 2);
  const usdgLeg = plan.legs.find((l) => l.symbol === "USDG");
  assert.equal(usdgLeg.route, "passthrough");
  assert.equal(usdgLeg.amountIn, 125_000_000n);
  assert.equal(usdgLeg.quotedOut, 125_000_000n);
  assert.equal(usdgLeg.minOut, 125_000_000n);

  const spcxLeg = plan.legs.find((l) => l.symbol === "SPCX");
  assert.equal(spcxLeg.route, "swap");
  assert.equal(spcxLeg.amountIn, 200_000_000n); // 40% of 500
  assert.equal(plan.fullyQuoted, true);
});

test("USDG input with illiquid equity leg retains input USDG without redundant swap", () => {
  const FIVE_HUNDRED_USDG = 500_000_000n;
  const plan = planBasketDeposit({
    totalWei: FIVE_HUNDRED_USDG,
    legs: SAMPLE_LEGS,
    quotes: {
      SPCX: { amountOut: 10_000_000_000_000_000_000n },
      AAPL: { amountOut: 0n, liquid: false }, // illiquid
      USDG: { amountOut: 125_000_000n },
    },
    slippageBps: 100,
    inputSymbol: "USDG",
    fallbackSymbol: "USDG",
  });

  assert.equal(plan.error, "");
  // AAPL fell back to USDG, which is the input currency!
  const aaplLeg = plan.legs.find((l) => l.symbol === "AAPL");
  assert.equal(aaplLeg.route, "fallback");
  assert.equal(aaplLeg.quotedOut, 175_000_000n);
  assert.equal(aaplLeg.minOut, 175_000_000n);

  // Passthrough is 125 USDG (USDG leg) + 175 USDG (AAPL fallback) = 300 USDG
  assert.equal(plan.passthroughWei, 300_000_000n);
  // Only 1 swap needed (SPCX for 200 USDG)
  assert.equal(plan.swaps.length, 1);
  assert.equal(plan.swaps[0].symbol, "SPCX");
  assert.equal(plan.fullyQuoted, true);
});

test("a CREDIT leg is planned separately from the Uniswap swap set", () => {
  const legs = [
    { symbol: "SPCX", bps: 4000, tokenAddress: "0x4a0E", decimals: 18 },
    { symbol: "AAPL", bps: 4000, tokenAddress: "0xaF3D", decimals: 18 },
    { symbol: CREDIT_SYMBOL, bps: 2000 },
  ];
  const FIVE_HUNDRED_USDG = 500_000_000n;
  const plan = planBasketDeposit({
    totalWei: FIVE_HUNDRED_USDG,
    legs,
    quotes: {
      SPCX: { amountOut: 200_000_000n },
      AAPL: { amountOut: 200_000_000n },
      [CREDIT_SYMBOL]: { amountOut: 100_000_000n },
    },
    slippageBps: 100,
    inputSymbol: "USDG",
  });

  assert.equal(plan.error, "");
  assert.equal(plan.fullyQuoted, true);

  const creditLeg = plan.legs.find((l) => l.symbol === CREDIT_SYMBOL);
  assert.equal(creditLeg.route, "credit");
  assert.equal(creditLeg.amountIn, 100_000_000n);
  assert.equal(creditLeg.minOut, 99_000_000n); // 1% slippage off the 100 USDG quote

  // CREDIT never enters the Uniswap swap set — it has its own list.
  assert.equal(
    plan.swaps.some((s) => s.symbol === CREDIT_SYMBOL),
    false,
  );
  assert.equal(plan.swaps.length, 2);
  assert.equal(plan.creditLegs.length, 1);
  assert.deepEqual(plan.creditLegs[0], {
    symbol: CREDIT_SYMBOL,
    amountIn: 100_000_000n,
    minOut: 99_000_000n,
  });
});

test("a CREDIT leg with no quote blocks execution instead of guessing a price", () => {
  const legs = [
    { symbol: "SPCX", bps: 8000, tokenAddress: "0x4a0E", decimals: 18 },
    { symbol: CREDIT_SYMBOL, bps: 2000 },
  ];
  const plan = planBasketDeposit({
    totalWei: 1_000_000_000n,
    legs,
    quotes: { SPCX: { amountOut: 800_000_000n } }, // no CREDIT quote
    inputSymbol: "USDG",
  });

  assert.equal(plan.error, "");
  const creditLeg = plan.legs.find((l) => l.symbol === CREDIT_SYMBOL);
  assert.equal(creditLeg.route, "credit");
  assert.equal(creditLeg.minOut, null);
  assert.equal(plan.fullyQuoted, false);
});
