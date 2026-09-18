import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { robinhoodChain, ROBINHOOD_RPC_URL } from "@/lib/chain";

export const WALLETCONNECT_PROJECT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  "00f8436094d161baf4740f8564a2a6f4";

export const wagmiConfig = getDefaultConfig({
  appName: "Heirloom ($HEIR)",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(ROBINHOOD_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
