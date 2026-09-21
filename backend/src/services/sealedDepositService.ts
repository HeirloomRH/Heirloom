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
 * 3. Any direct passthrough USDG is transferred to vaultAddress
 */
export async function executeSealedBasketDeposit(params: {
  vaultAddress: Address;
  payload: SealedDepositPayload;
}): Promise<{ pullTxHash: Hash; swapTxHash?: Hash; transferTxHash?: Hash }> {
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
      `Amount mismatch: legs sum (${totalLegsAmount}) + passthrough (${passthroughWei}) != permit total (${totalAmount})`
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
  let transferTxHash: Hash | undefined;

  // Step 2: Route swaps through Robinhood Chain SwapRouter02 if there are equity legs
  if (payload.legs.length > 0 && totalLegsAmount > 0n) {
    // Check relayer allowance to SwapRouter02
    const currentAllowance = await publicClient.readContract({
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: [relayerAccount.address, SWAP_ROUTER_ADDRESS],
    });

    if (currentAllowance < totalLegsAmount) {
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
    for (const leg of payload.legs) {
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
        })
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

  // Step 3: Transfer passthrough USDG directly to vaultAddress
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
    transferTxHash,
  };
}
