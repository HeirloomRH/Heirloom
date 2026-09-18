import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, ChevronDown, AlertTriangle } from "lucide-react";

interface ConnectButtonProps {
  className?: string;
  showBalance?: boolean;
}

export function ConnectButton({
  className = "",
  showBalance = false,
}: ConnectButtonProps) {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
            className="inline-flex items-center"
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    style={{ color: "#f1ede5" }}
                    className={`group inline-flex items-center gap-2 rounded-full border border-[#152c41] bg-[#152c41] px-4 py-1.5 text-xs font-medium !text-[#f1ede5] shadow-sm transition-all duration-200 hover:bg-[#254a6b] hover:border-[#326b99] active:scale-[0.98] ${className}`}
                  >
                    <Wallet size={13} className="text-[#94b8cf] transition group-hover:text-[#f1ede5]" />
                    <span className="tracking-wide !text-[#f1ede5]" style={{ color: "#f1ede5" }}>
                      Connect Wallet
                    </span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-full border border-rose-600/60 bg-rose-950/80 px-3 py-1.5 text-xs font-medium text-rose-200 shadow-sm transition hover:bg-rose-900 active:scale-[0.98] ${className}`}
                  >
                    <AlertTriangle size={13} className="text-rose-400" />
                    <span>Switch to Robinhood Chain</span>
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Network Switcher Button */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    title={`Connected to ${chain.name}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d8dee0] bg-[#eae5dc] px-2.5 py-1 text-xs font-medium text-[#152c41] transition hover:bg-[#ded6c9] active:scale-[0.98]"
                  >
                    {chain.hasIcon && chain.iconUrl ? (
                      <img
                        alt={chain.name ?? "Chain icon"}
                        src={chain.iconUrl}
                        className="h-3.5 w-3.5 rounded-full"
                      />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <span className="hidden sm:inline font-sans text-[11px] text-[#152c41]">{chain.name}</span>
                    <ChevronDown size={11} className="text-[#7b8992]" />
                  </button>

                  {/* Account / Address Button */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    style={{ color: "#f1ede5" }}
                    className={`inline-flex items-center gap-2 rounded-full border border-[#152c41] bg-[#152c41] px-3.5 py-1 text-xs font-medium !text-[#f1ede5] shadow-sm transition hover:bg-[#254a6b] active:scale-[0.98] ${className}`}
                  >
                    {showBalance && account.displayBalance && (
                      <span className="text-[11px] text-[#94b8cf] border-r border-[#254a6b] pr-2">
                        {account.displayBalance}
                      </span>
                    )}
                    <span className="font-mono text-[11px] !text-[#f1ede5]" style={{ color: "#f1ede5" }}>
                      {account.displayName}
                    </span>
                    <ChevronDown size={11} className="text-[#94b8cf]" />
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
