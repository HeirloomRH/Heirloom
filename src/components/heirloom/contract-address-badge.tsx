import { useState } from "react";
import { Copy, Check, ArrowUpRight } from "lucide-react";

interface ContractAddressBadgeProps {
  theme?: "light" | "dark";
  className?: string;
}

export function ContractAddressBadge({
  theme = "light",
  className = "",
}: ContractAddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("Coming soon");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`ca-badge ca-badge-${theme} ${className}`}>
      <div className="ca-badge-left">
        <span className="ca-badge-tag">CA</span>
        <span className="ca-badge-address">Coming soon</span>
      </div>
      <div className="ca-badge-actions">
        <button
          type="button"
          onClick={handleCopy}
          className="ca-btn"
          title="Copy contract address"
          aria-label="Copy contract address"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span className="ca-btn-text">{copied ? "Copied" : "Copy"}</span>
        </button>
        <a
          href="https://dexscreener.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ca-btn ca-dex-btn"
          title="Open in DexScreener"
          aria-label="Open in DexScreener"
        >
          <span>DexScreener</span>
          <ArrowUpRight size={12} />
        </a>
      </div>
    </div>
  );
}
