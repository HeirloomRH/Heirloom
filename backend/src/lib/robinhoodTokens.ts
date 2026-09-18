import {
  isAddress,
  getAddress,
  parseUnits,
  formatUnits,
  createPublicClient,
  http,
  erc20Abi,
  defineChain,
  type PublicClient,
} from "viem";
import { config } from "../config.js";

export interface RobinhoodTokenInfo {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  isNative?: boolean;
  isBaseCurrency?: boolean;
  underlyingTicker?: string;
  iconUrl?: string;
  assetType: "native" | "stablecoin" | "equity" | "etf" | "commodity";
}

export const ROBINHOOD_CHAIN_ID = config.rhcId;
export const ROBINHOOD_EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const ROBINHOOD_DEFAULT_RPC = config.rhcRpcUrl;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [ROBINHOOD_DEFAULT_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: ROBINHOOD_EXPLORER_URL,
    },
  },
});

export const ETH: RobinhoodTokenInfo = {
  symbol: "ETH",
  name: "Ether",
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  isNative: true,
  isBaseCurrency: true,
  iconUrl: "/RH-RWA-Assets-Media/eth.jpeg",
  assetType: "native",
};

export const WETH: RobinhoodTokenInfo = {
  symbol: "WETH",
  name: "Wrapped Ether",
  address: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  decimals: 18,
  isBaseCurrency: true,
  iconUrl: "/RH-RWA-Assets-Media/eth.jpeg",
  assetType: "native",
};

export const USDG: RobinhoodTokenInfo = {
  symbol: "USDG",
  name: "Global Dollar",
  address: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  decimals: 6,
  isBaseCurrency: true,
  iconUrl: "/RH-RWA-Assets-Media/usdg_logo.png",
  assetType: "stablecoin",
};

export const FEATURED_ROBINHOOD_ASSETS: RobinhoodTokenInfo[] = [
  {
    symbol: "SPCX",
    name: "SpaceX (Space Exploration Technologies Corp.)",
    underlyingTicker: "SPCX",
    address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/spacex.png",
    assetType: "equity",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc. Token",
    underlyingTicker: "AAPL",
    address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/apple.png",
    assetType: "equity",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc. Token",
    underlyingTicker: "TSLA",
    address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/tesla.png",
    assetType: "equity",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp. Token",
    underlyingTicker: "NVDA",
    address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/nvidia.png",
    assetType: "equity",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc. Token",
    underlyingTicker: "GOOGL",
    address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/google.png",
    assetType: "equity",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc. Token",
    underlyingTicker: "AMZN",
    address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/amazon.png",
    assetType: "equity",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp. Token",
    underlyingTicker: "MSFT",
    address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/microsoft.png",
    assetType: "equity",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc. Token",
    underlyingTicker: "META",
    address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/meta.jpg",
    assetType: "equity",
  },
  {
    symbol: "COIN",
    name: "Coinbase Global Inc. Token",
    underlyingTicker: "COIN",
    address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/rh-icon.png",
    assetType: "equity",
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies Inc. Token",
    underlyingTicker: "PLTR",
    address: "0xd58319690185984605929F52745330e7ea20D0C4",
    decimals: 18,
    iconUrl: "/RH-RWA-Assets-Media/rh-icon.png",
    assetType: "equity",
  },
];

export const ALL_ROBINHOOD_TOKENS: RobinhoodTokenInfo[] = [
  ETH,
  WETH,
  USDG,
  ...FEATURED_ROBINHOOD_ASSETS,
];

export const ALIASES: Record<string, string> = {
  SPACEX: "SPCX",
  AAPLR: "AAPL",
  TSLAR: "TSLA",
  NVDAR: "NVDA",
  GOOGLR: "GOOGL",
  AMZNR: "AMZN",
  MSFTR: "MSFT",
  METAR: "META",
  COINR: "COIN",
  USDC: "USDG",
};

export function getAllRobinhoodTokens(): RobinhoodTokenInfo[] {
  return ALL_ROBINHOOD_TOKENS;
}

export function isValidEvmAddress(address: string | undefined | null): boolean {
  if (!address || typeof address !== "string") return false;
  return isAddress(address.trim());
}

export function resolveRobinhoodToken(query: string | undefined | null): RobinhoodTokenInfo | undefined {
  if (!query || typeof query !== "string") return undefined;
  const clean = query.trim();

  // 1. Exact address match (case-insensitive)
  if (isAddress(clean)) {
    const checksummed = getAddress(clean);
    return ALL_ROBINHOOD_TOKENS.find(
      (t) => t.address.toLowerCase() === checksummed.toLowerCase()
    );
  }

  // 2. Check alias map first
  const upperRaw = clean.toUpperCase();
  const aliased = ALIASES[upperRaw] || upperRaw;

  // 3. Exact symbol or underlying ticker match (case-insensitive)
  const direct = ALL_ROBINHOOD_TOKENS.find(
    (t) =>
      t.symbol.toUpperCase() === aliased ||
      (t.underlyingTicker && t.underlyingTicker.toUpperCase() === aliased)
  );
  if (direct) return direct;

  // 4. Name or substring match
  const lower = clean.toLowerCase();
  return ALL_ROBINHOOD_TOKENS.find(
    (t) => t.name.toLowerCase().includes(lower) || t.symbol.toLowerCase() === lower
  );
}

export function parseTokenUnits(amount: number | string, decimals: number): string {
  const str = typeof amount === "number" ? amount.toString() : amount;
  return parseUnits(str, decimals).toString();
}

export function formatTokenUnits(atomicUnits: string | bigint, decimals: number): string {
  const bn = typeof atomicUnits === "string" ? BigInt(atomicUnits) : atomicUnits;
  return formatUnits(bn, decimals);
}

/**
 * Public client for interacting with Robinhood Chain
 */
export const rhcClient: PublicClient = createPublicClient({
  transport: http(ROBINHOOD_DEFAULT_RPC),
});

/**
 * Fetch balances for a wallet address across all supported Robinhood assets
 */
export async function fetchWalletBalances(walletAddress: `0x${string}`): Promise<Array<{
  token: RobinhoodTokenInfo;
  balanceRaw: string;
  balanceFormatted: string;
}>> {
  const results: Array<{
    token: RobinhoodTokenInfo;
    balanceRaw: string;
    balanceFormatted: string;
  }> = [];

  // 1. Native ETH balance
  try {
    const nativeBal = await rhcClient.getBalance({ address: walletAddress });
    results.push({
      token: ETH,
      balanceRaw: nativeBal.toString(),
      balanceFormatted: formatUnits(nativeBal, ETH.decimals),
    });
  } catch (err) {
    results.push({
      token: ETH,
      balanceRaw: "0",
      balanceFormatted: "0",
    });
  }

  // 2. ERC-20 token balances
  const erc20Tokens = ALL_ROBINHOOD_TOKENS.filter((t) => !t.isNative);
  const balancePromises = erc20Tokens.map(async (token) => {
    try {
      const balance = await rhcClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      });
      return {
        token,
        balanceRaw: balance.toString(),
        balanceFormatted: formatUnits(balance, token.decimals),
      };
    } catch {
      return {
        token,
        balanceRaw: "0",
        balanceFormatted: "0",
      };
    }
  });

  const tokenBalances = await Promise.all(balancePromises);
  results.push(...tokenBalances);

  return results;
}
