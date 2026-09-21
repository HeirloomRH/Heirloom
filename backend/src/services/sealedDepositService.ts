import {
  createWalletClient,
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  getAddress,
  maxUint256,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";
import { robinhoodChain, ROBINHOOD_DEFAULT_RPC } from "../lib/robinhoodTokens.js";

export const PERMIT2_ADDRESS: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const USDG_ADDRESS: Address = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
export const SWAP_ROUTER_ADDRESS: Address = "0xcaf681a66d020601342297493863e78c959e5cb2";
export const CREDIT_ADDRESS: Address = config.creditAddress as Address;
export const ORBIO_EXCHANGE_ADDRESS: Address = config.orbioExchangeAddress as Address;

export const permit2Abi = [
  {
    name: "permitTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "permit",
        type: "tuple",
        components: [
          {
            name: "permitted",
            type: "tuple",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      {
        name: "transferDetails",
        type: "tuple",
        components: [
          { name: "to", type: "address" },
          { name: "requestedAmount", type: "uint256" },
        ],
      },
      { name: "owner", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

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
] as const;

// Orbio Exchange (CREDIT order book). Signatures per the Heirloom x Orbio
// integration spec — NOT yet independently confirmed against a published ABI
// (the contract is verified on-chain but its source was not decoded here), so
// treat this as best-effort until it has been fork-tested against RHC.
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
  {
    name: "buy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "usdgIn", type: "uint256" },
      { name: "minCreditOut", type: "uint256" },
      { name: "maxFills", type: "uint256" },
    ],
    outputs: [{ name: "creditOut", type: "uint256" }],
  },
] as const;

/**
 * The floor a CREDIT buy must clear: never pay more than $1.00 + tolerance
 * per CREDIT. USDG and CREDIT are both 6-decimal, so at par `usdgIn` of USDG
 * should never buy less than this much CREDIT. Widened by the caller-supplied
 * slippage-based minOut when that's stricter (e.g. a quote below the $1 peg,
 * where ordinary slippage tolerance is the binding constraint instead).
 */
export function computeMinCreditOut(
  usdgIn: bigint,
  requestedMinOut: bigint,
  toleranceBps: number,
): bigint {
  const pegFloor = (usdgIn * 10000n) / (10000n + BigInt(toleranceBps));
  return requestedMinOut > pegFloor ? requestedMinOut : pegFloor;
}

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(config.rhcRpcUrl || ROBINHOOD_DEFAULT_RPC),
});

/**
 * Get the relayer account if configured
 */
export function getRelayerAccount() {
  const rawKey = config.relayerPrivateKey.trim();
  if (!rawKey) return null;
  const formatted = rawKey.startsWith("0x") ? (rawKey as Hex) : (`0x${rawKey}` as Hex);
  try {
    return privateKeyToAccount(formatted);
  } catch (err) {
    console.error("Failed to parse RELAYER_PRIVATE_KEY:", err);
    return null;
  }
}

/**
 * Public relayer information for client discovery
 */
export function getRelayerInfo() {
  const account = getRelayerAccount();
  return {
    relayerAddress: account ? account.address : null,
    permit2Address: PERMIT2_ADDRESS,
    usdgAddress: USDG_ADDRESS,
    routerAddress: SWAP_ROUTER_ADDRESS,
    creditAddress: CREDIT_ADDRESS,
    orbioExchangeAddress: ORBIO_EXCHANGE_ADDRESS,
    network: "Robinhood Chain",
    chainId: config.rhcId,
    isLive: account !== null,
  };
}

export interface SealedDepositLeg {
  symbol: string;
  tokenAddress: string;
  amountIn: string; // BigInt string
  minOut: string; // BigInt string
  fee: number;
  // "SWAP" (default, omitted for existing callers) routes through
  // SwapRouter02 like any equity leg. "CREDIT" routes the same amountIn
  // through the Orbio Exchange instead, so it never touches a Uniswap pool.
  kind?: "SWAP" | "CREDIT";
}

export interface SealedDepositPayload {
  permit: {
    permitted: {
      token: string;
      amount: string;
    };
    nonce: string;
    deadline: string;
  };
  signature: Hex;
  owner: string;
  legs: SealedDepositLeg[];
  passthroughWei: string;
}

/**
 * Executes a sealed basket deposit:
 * 1. Pulls USDG from grantor using Permit2 permitTransferFrom directly to relayer
 * 2. Relayer approves SwapRouter02 and executes multicall exactInputSingle -> outputs land in vaultAddress
 * 3. Relayer buys any CREDIT leg through the Orbio Exchange, quote-band enforced, then forwards it to vaultAddress
 * 4. Any direct passthrough USDG is transferred to vaultAddress
 */
export async function executeSealedBasketDeposit(params: {
  vaultAddress: Address;
  payload: SealedDepositPayload;
}): Promise<{
  pullTxHash: Hash;
  swapTxHash?: Hash;
  creditBuyTxHash?: Hash;
  creditTransferTxHash?: Hash;
  transferTxHash?: Hash;
}> {
  const relayerAccount = getRelayerAccount();
  if (!relayerAccount) {
    throw new Error("Relayer service is unconfigured on this node. Please contact support.");
  }

  const walletClient = createWalletClient({
    account: relayerAccount,
    chain: robinhoodChain,
    transport: http(config.rhcRpcUrl || ROBINHOOD_DEFAULT_RPC),
  });

  const { vaultAddress, payload } = params;
  const owner = getAddress(payload.owner);
  const token = getAddress(payload.permit.permitted.token);
  const totalAmount = BigInt(payload.permit.permitted.amount);
  const nonce = BigInt(payload.permit.nonce);
  const deadline = BigInt(payload.permit.deadline);
  const passthroughWei = BigInt(payload.passthroughWei || "0");

  if (token.toLowerCase() !== USDG_ADDRESS.toLowerCase()) {
    throw new Error(`Invalid permit token: expected USDG ${USDG_ADDRESS}, got ${token}`);
  }

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  if (nowSeconds > deadline) {
    throw new Error(`Permit signature expired (deadline: ${deadline}, current: ${nowSeconds})`);
  }

  // Calculate routed amount from legs
  let totalLegsAmount = 0n;
  for (const leg of payload.legs) {
    totalLegsAmount += BigInt(leg.amountIn);
  }

  if (totalLegsAmount + passthroughWei !== totalAmount) {
    throw new Error(
      `Amount mismatch: legs sum (${totalLegsAmount}) + passthrough (${passthroughWei}) != permit total (${totalAmount})`,
    );
  }

  // Step 1: Pull USDG from owner via Permit2
  const pullTxHash = await walletClient.writeContract({
    address: PERMIT2_ADDRESS,
    abi: permit2Abi,
    functionName: "permitTransferFrom",
    args: [
      {
        permitted: {
          token: USDG_ADDRESS,
          amount: totalAmount,
        },
        nonce,
        deadline,
      },
      {
        to: relayerAccount.address,
        requestedAmount: totalAmount,
      },
      owner,
      payload.signature,
    ],
  });

  // Wait for pull to land on-chain
  const pullReceipt = await publicClient.waitForTransactionReceipt({ hash: pullTxHash });
  if (pullReceipt.status !== "success") {
    throw new Error(`Permit2 transfer failed on-chain: ${pullTxHash}`);
  }

  let swapTxHash: Hash | undefined;
  let creditBuyTxHash: Hash | undefined;
  let creditTransferTxHash: Hash | undefined;
  let transferTxHash: Hash | undefined;

  const swapLegs = payload.legs.filter((leg) => leg.kind !== "CREDIT");
  const creditLegs = payload.legs.filter((leg) => leg.kind === "CREDIT");
  const totalSwapAmount = swapLegs.reduce((sum, leg) => sum + BigInt(leg.amountIn), 0n);

  // Step 2: Route swaps through Robinhood Chain SwapRouter02 if there are equity legs
  if (swapLegs.length > 0 && totalSwapAmount > 0n) {
    // Check relayer allowance to SwapRouter02
    const currentAllowance = await publicClient.readContract({
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [relayerAccount.address, SWAP_ROUTER_ADDRESS],
    });

    if (currentAllowance < totalSwapAmount) {
      const approveTx = await walletClient.writeContract({
        address: USDG_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [SWAP_ROUTER_ADDRESS, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    // Build multicall calls
    const calls: Hex[] = [];
    for (const leg of swapLegs) {
      const amountIn = BigInt(leg.amountIn);
      const minOut = BigInt(leg.minOut);
      const tokenOut = getAddress(leg.tokenAddress);

      calls.push(
        encodeFunctionData({
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: USDG_ADDRESS,
              tokenOut,
              fee: leg.fee,
              recipient: vaultAddress, // Tokens go directly to the vault!
              amountIn,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0n,
            },
          ],
        }),
      );
    }

    swapTxHash = await walletClient.writeContract({
      address: SWAP_ROUTER_ADDRESS,
      abi: swapRouterAbi,
      functionName: "multicall",
      args: [deadline, calls],
      value: 0n,
    });

    const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapTxHash });
    if (swapReceipt.status !== "success") {
      throw new Error(`Swap router multicall reverted on-chain: ${swapTxHash}`);
    }
  }

  // Step 3: Buy any CREDIT leg through the Orbio Exchange and forward it to the vault.
  // The exchange has no recipient parameter, so CREDIT lands on the relayer first;
  // balance-before/after (not the ABI's declared return value, which is unconfirmed)
  // is what decides how much gets forwarded.
  if (creditLegs.length > 0) {
    const creditAmountIn = creditLegs.reduce((sum, leg) => sum + BigInt(leg.amountIn), 0n);
    const requestedMinOut = creditLegs.reduce((sum, leg) => sum + BigInt(leg.minOut), 0n);
    const minCreditOut = computeMinCreditOut(
      creditAmountIn,
      requestedMinOut,
      config.orbioQuoteToleranceBps,
    );

    const maxFills = 10n;
    const quotedOut = await publicClient.readContract({
      address: ORBIO_EXCHANGE_ADDRESS,
      abi: orbioExchangeAbi,
      functionName: "getQuote",
      args: [creditAmountIn, maxFills],
    });
    if (quotedOut < minCreditOut) {
      throw new Error(
        `Orbio CREDIT quote outside acceptable band: quoted ${quotedOut} for ${creditAmountIn} USDG, need at least ${minCreditOut}. Deposit deferred, no funds moved for this leg.`,
      );
    }

    const currentAllowance = await publicClient.readContract({
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [relayerAccount.address, ORBIO_EXCHANGE_ADDRESS],
    });
    if (currentAllowance < creditAmountIn) {
      const approveTx = await walletClient.writeContract({
        address: USDG_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [ORBIO_EXCHANGE_ADDRESS, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    }

    const creditBalanceBefore = await publicClient.readContract({
      address: CREDIT_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [relayerAccount.address],
    });

    creditBuyTxHash = await walletClient.writeContract({
      address: ORBIO_EXCHANGE_ADDRESS,
      abi: orbioExchangeAbi,
      functionName: "buy",
      args: [creditAmountIn, minCreditOut, maxFills],
    });
    const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: creditBuyTxHash });
    if (buyReceipt.status !== "success") {
      throw new Error(`Orbio Exchange buy() reverted on-chain: ${creditBuyTxHash}`);
    }

    const creditBalanceAfter = await publicClient.readContract({
      address: CREDIT_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [relayerAccount.address],
    });
    const creditReceived = creditBalanceAfter - creditBalanceBefore;
    if (creditReceived < minCreditOut) {
      throw new Error(
        `Orbio Exchange buy() returned less CREDIT than the enforced minimum: got ${creditReceived}, needed ${minCreditOut}`,
      );
    }

    creditTransferTxHash = await walletClient.writeContract({
      address: CREDIT_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vaultAddress, creditReceived],
    });
    const creditTransferReceipt = await publicClient.waitForTransactionReceipt({
      hash: creditTransferTxHash,
    });
    if (creditTransferReceipt.status !== "success") {
      throw new Error(`CREDIT transfer to vault reverted: ${creditTransferTxHash}`);
    }
  }

  // Step 4: Transfer passthrough USDG directly to vaultAddress
  if (passthroughWei > 0n) {
    transferTxHash = await walletClient.writeContract({
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vaultAddress, passthroughWei],
    });

    const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferTxHash });
    if (transferReceipt.status !== "success") {
      throw new Error(`USDG passthrough transfer reverted: ${transferTxHash}`);
    }
  }

  return {
    pullTxHash,
    swapTxHash,
    creditBuyTxHash,
    creditTransferTxHash,
    transferTxHash,
  };
}
