import { useState, useEffect } from "react";

export const RH_FALLBACK_ICON = "/RH-RWA-Assets-Media/rh-icon.png";

export const RH_ASSET_ICONS: Record<string, string> = {
  ETH: "/RH-RWA-Assets-Media/eth.jpeg",
  WETH: "/RH-RWA-Assets-Media/eth.jpeg",
  USDG: "/RH-RWA-Assets-Media/usdg_logo.png",
  SPCX: "/RH-RWA-Assets-Media/spacex.png",
  AAPL: "/RH-RWA-Assets-Media/apple.png",
  TSLA: "/RH-RWA-Assets-Media/tesla.png",
  NVDA: "/RH-RWA-Assets-Media/nvidia.png",
  GOOGL: "/RH-RWA-Assets-Media/google.png",
  AMZN: "/RH-RWA-Assets-Media/amazon.png",
  MSFT: "/RH-RWA-Assets-Media/microsoft.png",
  META: "/RH-RWA-Assets-Media/meta.jpg",
};

export function getAssetIcon(symbol?: string): string {
  if (!symbol) return RH_FALLBACK_ICON;
  const upper = symbol.toUpperCase().trim();
  return RH_ASSET_ICONS[upper] || RH_FALLBACK_ICON;
}

export function AssetIcon({
  symbol,
  className = "w-6 h-6",
  alt,
}: {
  symbol?: string;
  className?: string;
  alt?: string;
}) {
  const [imgSrc, setImgSrc] = useState(() => getAssetIcon(symbol));

  useEffect(() => {
    setImgSrc(getAssetIcon(symbol));
  }, [symbol]);

  return (
    <img
      src={imgSrc}
      alt={alt || `${symbol || "Asset"} icon`}
      className={`rounded-full object-contain shrink-0 bg-white border border-[#d8dee0]/60 p-0.5 shadow-xs ${className}`}
      onError={() => {
        if (imgSrc !== RH_FALLBACK_ICON) {
          setImgSrc(RH_FALLBACK_ICON);
        }
      }}
    />
  );
}
