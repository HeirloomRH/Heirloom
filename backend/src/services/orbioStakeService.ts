import { createWalletClient, http, erc20Abi, maxUint256, type Address, type Hash } from "viem";
import { robinhoodChain, ROBINHOOD_DEFAULT_RPC } from "../lib/robinhoodTokens.js";
import { getVaultAccount } from "./vaultService.js";
import { publicClient } from "./sealedDepositService.js";

// Orbio Staking. Signatures confirmed by fork-testing the real deployed
// contract (0xe0710011...eddca on RHC) — the doc's own interface
// (stake/unstake) was correct, but it omits claim() and, critically, the
// balance query: balanceOf(address) reverts on this contract, the real one
// is positionOf(address). A real stake -> positionOf -> unstake cycle was
// executed on a fork and confirmed working end to end.
//
// What could NOT be fork-tested: reward *amounts*. Settlement ("Settles and
// mints each finalized hour's CREDIT" per orbio.so) is driven by Orbio's own
// off-chain keeper bots calling role-gated functions (settle, harvest,
// harvestFunding — all behind KEEPER_ROLE/HARVEST_FUNDER_ROLE) against live
// mainnet state. A fork has no keeper running against it, so claim() only
// ever returns 0 there. claim() itself was confirmed callable and reverts
// safely to 0 rather than erroring when nothing has settled yet.
export const orbioStakeAbi = [
  {
    name: "stake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unstake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "credited", type: "uint256" }],
  },
  {
    name: "positionOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "staked", type: "uint256" }],
  },
  {
    name: "MIN_POSITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ORBIO_ADDRESS: Address = "0xaa07a0e9209e16ac99708c3ec70159c6ef3128a3";
export const ORBIO_STAKING_ADDRESS: Address = "0xe0710011278bfb63e57c5f227e5980984b1eddca";
export const CREDIT_ADDRESS: Address = "0xe33322da1380e61e5ae5dfb21e7f62924c73004c";

function vaultWalletClient(vaultIndex: number) {
  return createWalletClient({
    account: getVaultAccount(vaultIndex),
    chain: robinhoodChain,
    transport: http(ROBINHOOD_DEFAULT_RPC),
  });
}

export async function getStakedPosition(vaultAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: ORBIO_STAKING_ADDRESS,
    abi: orbioStakeAbi,
    functionName: "positionOf",
    args: [vaultAddress],
  });
}

export async function getMinPosition(): Promise<bigint> {
  return publicClient.readContract({
    address: ORBIO_STAKING_ADDRESS,
    abi: orbioStakeAbi,
    functionName: "MIN_POSITION",
  });
}

/** Stakes `amount` of ORBIO already sitting in the trust's own vault. */
export async function executeStake(vaultIndex: number, amount: bigint): Promise<Hash> {
  const account = getVaultAccount(vaultIndex);
  const walletClient = vaultWalletClient(vaultIndex);

  const currentAllowance = await publicClient.readContract({
    address: ORBIO_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, ORBIO_STAKING_ADDRESS],
  });
  if (currentAllowance < amount) {
    const approveTx = await walletClient.writeContract({
      address: ORBIO_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ORBIO_STAKING_ADDRESS, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  const txHash = await walletClient.writeContract({
    address: ORBIO_STAKING_ADDRESS,
    abi: orbioStakeAbi,
    functionName: "stake",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`stake() reverted on-chain: ${txHash}`);
  }
  return txHash;
}

/** Unstakes `amount` of ORBIO back into the trust's own vault. */
export async function executeUnstake(vaultIndex: number, amount: bigint): Promise<Hash> {
  const walletClient = vaultWalletClient(vaultIndex);
  const txHash = await walletClient.writeContract({
    address: ORBIO_STAKING_ADDRESS,
    abi: orbioStakeAbi,
    functionName: "unstake",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`unstake() reverted on-chain: ${txHash}`);
  }
  return txHash;
}

/**
 * Claims any CREDIT settled since the last claim, straight into the vault's
 * own CREDIT balance (claim() has no recipient param — msg.sender is the
 * vault wallet itself, so nothing needs forwarding). Returns the amount
 * actually received, measured by balance delta rather than trusting the
 * ABI's declared return value, which wasn't independently confirmed.
 */
export async function executeClaim(
  vaultIndex: number,
): Promise<{ txHash: Hash; creditReceived: bigint }> {
  const account = getVaultAccount(vaultIndex);
  const walletClient = vaultWalletClient(vaultIndex);

  const before = await publicClient.readContract({
    address: CREDIT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const txHash = await walletClient.writeContract({
    address: ORBIO_STAKING_ADDRESS,
    abi: orbioStakeAbi,
    functionName: "claim",
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`claim() reverted on-chain: ${txHash}`);
  }

  const after = await publicClient.readContract({
    address: CREDIT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  return { txHash, creditReceived: after - before };
}
