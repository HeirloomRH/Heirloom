import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowUpRight, ShieldCheck } from "lucide-react";
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from "@/lib/chain";

export function DemoNotice() {
  return (
    <div className="demo-notice flex items-center justify-between border-b border-[#302a24] bg-[#1a1613]/80 px-4 py-2 text-xs text-[#c4bcaf]">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium text-[#e4ded6]">
          Robinhood Chain (Chain ID: {ROBINHOOD_CHAIN_ID})
        </span>
        <span className="notice-detail text-[#8d7c68]">
          · Dedicated Vault Engine · Non-Custodial Trust Vaults
        </span>
      </div>
      <a
        href={ROBINHOOD_EXPLORER_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[#c4a47c] transition hover:text-[#e4ded6]"
      >
        Blockscout Explorer <ArrowUpRight size={12} />
      </a>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h3 id="dialog-title">{title}</h3>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
