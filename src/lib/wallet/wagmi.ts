import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { robinhoodChain } from "@/lib/chain";

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "Heirloom" }),
  ],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
