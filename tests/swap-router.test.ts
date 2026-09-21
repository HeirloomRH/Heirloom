import { test, expect } from "bun:test";
import { decodeFunctionData } from "viem";
import { planBasketDeposit } from "../src/lib/heirloom/basket.mjs";
import {
  encodeBasketDeposit,
  buildBasketDepositRequest,
  buildUsdgApprovalRequest,
  buildUsdgTransferRequest,
  swapRouterAbi,
  SWAP_ROUTER_ADDRESS,
  WETH_ADDRESS,
  USDG_ADDRESS,
  V3_FEE_TIERS,
} from "../src/lib/heirloom/swap-router";

const ONE_ETH = 10n ** 18n;
const VAULT = "0x1111111111111111111111111111111111111111" as const;

// Real Robinhood Chain token addresses from the backend catalog.
const SPCX = "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa" as const;
const AAPL = "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" as const;
const USDG = "0x5fc5360d0400a0fd4f2af552add042d716f1d168" as const;

const LEGS = [
  { symbol: "SPCX", bps: 4000, tokenAddress: SPCX, decimals: 18 },
  { symbol: "AAPL", bps: 3500, tokenAddress: AAPL, decimals: 18 },
  { symbol: "USDG", bps: 2500, tokenAddress: USDG, decimals: 6 },
];

// Amounts and fee tiers mirror what the live chain actually quotes for 0.1 ETH:
// SPCX and AAPL only have depth at 0.05%, USDG is deepest at 0.01%.
const QUOTES = {
  SPCX: {
    amountOut: 1_729_344_644_770_449_587n,
    routing: { type: "direct" as const, fee: 500 },
  },
  AAPL: {
    amountOut: 795_770_542_729_264_474n,
    routing: { type: "direct" as const, fee: 500 },
  },
  USDG: {
    amountOut: 266_689_169n,
    routing: { type: "direct" as const, fee: 100 },
  },
};

function ethPlan() {
  return planBasketDeposit({
    totalWei: ONE_ETH / 2n,
    legs: LEGS,
    quotes: QUOTES,
    slippageBps: 100,
    inputSymbol: "ETH",
  });
}

/** Decode one inner multicall entry. */
function decodeCall(data: `0x${string}`) {
  return decodeFunctionData({ abi: swapRouterAbi, data });
}

/** The single struct argument of an exactInputSingle call. */
function swapParams(data: `0x${string}`): Record<string, unknown> {
  const decoded = decodeCall(data);
  return (decoded.args as readonly Record<string, unknown>[])[0];
}

test("a basket encodes as one exactInputSingle per leg plus a refund", () => {
  const plan = ethPlan();
  const call = encodeBasketDeposit({ plan, recipient: VAULT });

  expect(call.calls.length).toBe(4); // 3 legs + refundETH
  expect(call.calls.map((d) => decodeCall(d).functionName)).toEqual([
    "exactInputSingle",
    "exactInputSingle",
    "exactInputSingle",
    "refundETH",
  ]);

  // The whole deposit rides along as msg.value; SwapRouter02 wraps it.
  expect(call.value).toBe(ONE_ETH / 2n);
});

test("every leg pays WETH, delivers to the vault, and spends its own share", () => {
  const plan = ethPlan();
  const call = encodeBasketDeposit({ plan, recipient: VAULT });

  let encodedIn = 0n;
  for (let i = 0; i < 3; i++) {
    const p = swapParams(call.calls[i]);

    // tokenIn is WETH, never the zero address: the router mints it from value.
    expect(String(p.tokenIn).toLowerCase()).toBe(WETH_ADDRESS.toLowerCase());
    expect(String(p.tokenOut).toLowerCase()).toBe(
      String(plan.swaps[i].tokenAddress).toLowerCase(),
    );
    // Output goes straight to the vault, never back to the grantor.
    expect(p.recipient).toBe(VAULT);
    expect(p.amountIn).toBe(plan.swaps[i].amountIn);
    expect(p.sqrtPriceLimitX96).toBe(0n);
    encodedIn += p.amountIn as bigint;
  }

  // The encoded legs spend the deposit exactly, with nothing stranded.
  expect(encodedIn).toBe(ONE_ETH / 2n);
});

test("each leg carries the fee tier it was actually quoted against", () => {
  const call = encodeBasketDeposit({ plan: ethPlan(), recipient: VAULT });
  const fees = call.calls.slice(0, 3).map((d) => swapParams(d).fee);

  // Not a hardcoded default: SPCX/AAPL quote at 0.05%, USDG at 0.01%.
  expect(fees).toEqual([500, 500, 100]);
  for (const fee of fees)
    expect(V3_FEE_TIERS).toContain(fee as (typeof V3_FEE_TIERS)[number]);
});

test("minimum output is the quote less slippage, floored", () => {
  const call = encodeBasketDeposit({ plan: ethPlan(), recipient: VAULT });

  for (let i = 0; i < 3; i++) {
    const symbol = LEGS[i].symbol as keyof typeof QUOTES;
    expect(swapParams(call.calls[i]).amountOutMinimum).toBe(
      (QUOTES[symbol].amountOut * 9900n) / 10000n,
    );
  }
});

test("slippage tolerance reaches the calldata", () => {
  const tight = encodeBasketDeposit({
    plan: planBasketDeposit({
      totalWei: ONE_ETH,
      legs: LEGS,
      quotes: QUOTES,
      slippageBps: 50,
    }),
    recipient: VAULT,
  });
  expect(swapParams(tight.calls[0]).amountOutMinimum).toBe(
    (QUOTES.SPCX.amountOut * 9950n) / 10000n,
  );
});

test("the trailing refund returns unspent ETH to the sender", () => {
  const call = encodeBasketDeposit({ plan: ethPlan(), recipient: VAULT });
  const refund = decodeCall(call.calls[call.calls.length - 1]);
  expect(refund.functionName).toBe("refundETH");
  // refundETH pays msg.sender, so it takes no arguments.
  expect(refund.args ?? []).toEqual([]);
});

test("an unquoted plan is refused rather than encoded on a guessed minimum", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: LEGS,
    quotes: {}, // no liquidity data at all
  });
  expect(plan.fullyQuoted).toBe(false);
  expect(() => encodeBasketDeposit({ plan, recipient: VAULT })).toThrow(
    /unquoted legs/,
  );
});

test("a leg quoted without a pool tier is refused instead of defaulted", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: [{ symbol: "SPCX", bps: 10000, tokenAddress: SPCX, decimals: 18 }],
    quotes: { SPCX: { amountOut: 1000n } },
  });
  expect(plan.fullyQuoted).toBe(true);
  expect(() => encodeBasketDeposit({ plan, recipient: VAULT })).toThrow(
    /fee tier/,
  );
});

test("an invalid plan never reaches the encoder", () => {
  const plan = planBasketDeposit({ totalWei: 0n, legs: LEGS, quotes: QUOTES });
  expect(plan.error).toBe("basket_amount_positive");
  expect(() => encodeBasketDeposit({ plan, recipient: VAULT })).toThrow(
    /basket_amount_positive/,
  );
});

test("the wagmi request is a multicall on SwapRouter02 with a live deadline", () => {
  const before = BigInt(Math.floor(Date.now() / 1000));
  const req = buildBasketDepositRequest({
    plan: ethPlan(),
    recipient: VAULT,
    deadlineSeconds: 1200,
  });

  expect(req.address).toBe(SWAP_ROUTER_ADDRESS);
  expect(req.functionName).toBe("multicall");
  expect(req.value).toBe(ONE_ETH / 2n);

  const [deadline, calls] = req.args;
  expect(deadline).toBeGreaterThanOrEqual(before + 1199n);
  expect(deadline).toBeLessThanOrEqual(before + 1202n);
  expect(calls.length).toBe(4);
});

test("an illiquid leg is folded into USDG, keeping the deposit whole", () => {
  const plan = planBasketDeposit({
    totalWei: ONE_ETH,
    legs: LEGS,
    quotes: {
      SPCX: { amountOut: 0n, liquid: false },
      AAPL: QUOTES.AAPL,
      USDG: QUOTES.USDG,
    },
  });

  // SPCX merged into USDG, so the merged swap must be re-quoted before use.
  expect(plan.swaps.length).toBe(2);
  expect(plan.routedWei).toBe(ONE_ETH);
  expect(plan.fullyQuoted).toBe(false);
  expect(() => encodeBasketDeposit({ plan, recipient: VAULT })).toThrow(
    /unquoted legs/,
  );
});

test("USDG basket deposit encodes with tokenIn = USDG_ADDRESS, value = 0n, and no refundETH", () => {
  const FIVE_HUNDRED_USDG = 500_000_000n;
  const usdgPlan = planBasketDeposit({
    totalWei: FIVE_HUNDRED_USDG,
    legs: LEGS,
    quotes: {
      SPCX: { amountOut: 10_000_000_000_000_000_000n, routing: { type: "direct", fee: 500 } },
      AAPL: { amountOut: 1_000_000_000_000_000_000n, routing: { type: "direct", fee: 500 } },
      USDG: { amountOut: 125_000_000n, routing: null },
    },
    inputSymbol: "USDG",
    fallbackSymbol: "USDG",
  });

  const call = encodeBasketDeposit({ plan: usdgPlan, recipient: VAULT });

  // 2 swaps (SPCX and AAPL), 0 refundETH calls
  expect(call.calls.length).toBe(2);
  expect(call.value).toBe(0n); // ERC-20 has zero msg.value

  const functionNames = call.calls.map((d) => decodeCall(d).functionName);
  expect(functionNames).toEqual(["exactInputSingle", "exactInputSingle"]);

  for (let i = 0; i < 2; i++) {
    const p = swapParams(call.calls[i]);
    expect(String(p.tokenIn).toLowerCase()).toBe(USDG_ADDRESS.toLowerCase());
    expect(p.recipient).toBe(VAULT);
    expect(p.amountIn).toBe(usdgPlan.swaps[i].amountIn);
  }
});

test("buildUsdgApprovalRequest creates correct approve call for router", () => {
  const req = buildUsdgApprovalRequest({ amount: 375_000_000n });
  expect(req.address).toBe(USDG_ADDRESS);
  expect(req.functionName).toBe("approve");
  expect(req.args).toEqual([SWAP_ROUTER_ADDRESS, 375_000_000n]);
});

test("buildUsdgTransferRequest creates correct transfer call for direct passthrough", () => {
  const req = buildUsdgTransferRequest({ to: VAULT, amount: 125_000_000n });
  expect(req.address).toBe(USDG_ADDRESS);
  expect(req.functionName).toBe("transfer");
  expect(req.args).toEqual([VAULT, 125_000_000n]);
});

