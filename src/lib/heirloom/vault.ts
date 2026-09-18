export type Allocation = { symbol: string; name: string; weight: number };
export type Release = { date: string; percent: number };
export type Vault = {
  id: string;
  name: string;
  beneficiary: string;
  wallet: string;
  amount: number;
  allocations: Allocation[];
  schedule: Release[];
  mode: "revocable" | "irrevocable";
  heartbeat: number;
  guardian: string;
  letter: string;
  createdAt: string;
  lastCheckIn: string;
  paused: boolean;
  demo?: boolean;
  vaultAddress?: string;
  vaultIndex?: number;
  corpusFunded?: boolean;
  heartbeatDeadline?: string;
  grantorAddress?: string;
};
export const assets = [
  { symbol: "SPCX", name: "SpaceX / S&P Composite Token" },
  { symbol: "AAPL", name: "Apple Stock Token" },
  { symbol: "NVDA", name: "NVIDIA Stock Token" },
  { symbol: "TSLA", name: "Tesla Stock Token" },
  { symbol: "MSFT", name: "Microsoft Stock Token" },
  { symbol: "GOOGL", name: "Alphabet Stock Token" },
  { symbol: "AMZN", name: "Amazon Stock Token" },
  { symbol: "META", name: "Meta Platforms Token" },
  { symbol: "COIN", name: "Coinbase Stock Token" },
  { symbol: "USDG", name: "Global Dollar" },
  { symbol: "ETH", name: "Ether (Base Asset)" },
];
export const sample: Vault = {
  id: "sample",
  name: "Emma’s tomorrow",
  beneficiary: "Emma",
  wallet: "0x1111111111111111111111111111111111111111",
  amount: 25000,
  allocations: [
    { symbol: "SPCX", name: "SpaceX / S&P Composite Token", weight: 40 },
    { symbol: "AAPL", name: "Apple Stock Token", weight: 35 },
    { symbol: "USDG", name: "Global Dollar", weight: 25 },
  ],
  schedule: [
    { date: "2036-06-18", percent: 25 },
    { date: "2039-06-18", percent: 25 },
    { date: "2043-06-18", percent: 50 },
  ],
  mode: "revocable",
  heartbeat: 180,
  guardian: "",
  letter:
    "Dear Emma,\n\nThis is for the life you’ll build. For the places you’ll go, the things you’ll learn, and the person you’ll become.\n\nI started this with a small thought: what if a little today could give you a little more freedom tomorrow?\n\nYou don’t have to follow my path. Make it wonderfully yours.\n\nWith love, always.",
  createdAt: "2026-09-14T00:00:00.000Z",
  lastCheckIn: "2026-09-14T00:00:00.000Z",
  paused: false,
  demo: true,
};
export const STORE = "heirloom-demo-vaults-v1";
export function readVaults(): Vault[] {
  const raw = localStorage.getItem(STORE);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (v) =>
        !v ||
        v.demo !== true ||
        typeof v.id !== "string" ||
        !Array.isArray(v.allocations) ||
        !Array.isArray(v.schedule) ||
        typeof v.amount !== "number" ||
        typeof v.beneficiary !== "string" ||
        typeof v.name !== "string" ||
        typeof v.letter !== "string" ||
        typeof v.lastCheckIn !== "string",
    )
  )
    throw Error(
      "Your local vault data could not be read. Export browser data before clearing storage, or use a sample trust.",
    );
  return parsed;
}
export function saveVault(v: Vault) {
  const all = readVaults();
  localStorage.setItem(
    STORE,
    JSON.stringify([...all.filter((x) => x.id !== v.id), v]),
  );
}
export function removeVault(id: string) {
  localStorage.setItem(
    STORE,
    JSON.stringify(readVaults().filter((v) => v.id !== id)),
  );
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
export function exportVault(v: Vault) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(v, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "heirloom-demo-" + v.id + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
