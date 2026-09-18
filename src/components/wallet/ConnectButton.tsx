import { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { ROBINHOOD_CHAIN_ID } from "@/lib/chain";
import { Wallet, LogOut, ChevronDown, Check, AlertCircle } from "lucide-react";

export function ConnectButton({ className = "" }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWrongNetwork = isConnected && chainId !== ROBINHOOD_CHAIN_ID;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isConnecting}
          className={`inline-flex items-center gap-2 rounded-full border border-[#302a24] bg-[#1a1613] px-3.5 py-1.5 text-xs font-medium text-[#e4ded6] shadow-sm transition hover:border-[#8d7c68] hover:bg-[#25201b] ${className}`}
        >
          <Wallet size={14} className="text-[#c4a47c]" />
          <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
          <ChevronDown size={12} className="text-[#8d7c68]" />
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[#302a24] bg-[#14110e] p-2 shadow-xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8d7c68]">
              Connect to Robinhood Chain
            </p>
            <div className="mt-1 space-y-1">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector, chainId: ROBINHOOD_CHAIN_ID });
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-[#e4ded6] transition hover:bg-[#25201b]"
                >
                  <span className="font-medium">{connector.name}</span>
                  <span className="text-[10px] text-[#8d7c68]">RHC 4663</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: ROBINHOOD_CHAIN_ID })}
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-900/60 ${className}`}
      >
        <AlertCircle size={13} className="text-amber-400" />
        <span>Switch to Robinhood Chain</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-full border border-[#352f28] bg-[#161310] px-3.5 py-1.5 text-xs font-medium text-[#e4ded6] shadow-sm transition hover:border-[#8d7c68] ${className}`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-[11px]">
          {address ? shortenAddress(address) : ""}
        </span>
        <ChevronDown size={12} className="text-[#8d7c68]" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-[#302a24] bg-[#14110e] p-2 shadow-xl">
          <div className="border-b border-[#25201b] px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#8d7c68]">
              Connected Wallet
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#f5efe6]">
              {address ? shortenAddress(address) : ""}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Robinhood Chain (4663)</span>
            </div>
          </div>

          <div className="mt-1 space-y-1">
            <button
              onClick={handleCopy}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[#c4bcaf] transition hover:bg-[#25201b] hover:text-[#f5efe6]"
            >
              <span>Copy Address</span>
              {copied ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <span className="text-[10px] text-[#8d7c68]">Ctrl+C</span>
              )}
            </button>

            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 transition hover:bg-rose-950/30"
            >
              <LogOut size={12} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
