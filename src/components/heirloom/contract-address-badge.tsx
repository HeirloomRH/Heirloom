import { useState } from "react";
import { Copy, Check, ArrowUpRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  CONTRACT_ADDRESS,
  CONTRACT_DEXSCREENER_URL,
  shortenAddress,
} from "@/lib/heirloom/contract";

interface ContractAddressBadgeProps {
  theme?: "light" | "dark";
  className?: string;
}

export function ContractAddressBadge({
  theme = "light",
  className = "",
}: ContractAddressBadgeProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`ca-badge ca-badge-${theme} ${className}`}>
      <div className="ca-badge-left">
        <span className="ca-badge-tag">{t.contractBadge.tag}</span>
        <span className="ca-badge-address" title={CONTRACT_ADDRESS}>
          {shortenAddress(CONTRACT_ADDRESS)}
        </span>
      </div>
      <div className="ca-badge-actions">
        <button
          type="button"
          onClick={handleCopy}
          className="ca-btn"
          title={t.contractBadge.copyTitle}
          aria-label={t.contractBadge.copyTitle}
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span className="ca-btn-text">
            {copied ? t.contractBadge.copied : t.contractBadge.copy}
          </span>
        </button>
        <a
          href={CONTRACT_DEXSCREENER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ca-btn ca-dex-btn"
          title={t.contractBadge.dexScreenerTitle}
          aria-label={t.contractBadge.dexScreenerTitle}
        >
          <span>{t.contractBadge.dexScreener}</span>
          <ArrowUpRight size={12} />
        </a>
      </div>
    </div>
  );
}
