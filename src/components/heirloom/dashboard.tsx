import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  ArrowUpRight,
  Search,
  Heart,
  Clock3,
  LayoutGrid,
  Rows3,
  ShieldCheck,
  Wallet,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Mark } from "./chrome";
import { DemoNotice } from "./product";
import { useAccount } from "wagmi";
import {
  fetchGrantorTrusts,
  fetchBeneficiaryTrusts,
  fetchAllTrusts,
} from "@/lib/api";
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from "@/lib/chain";
import { ConnectButton } from "../wallet/ConnectButton";

export interface NormalizedTrust {
  id: string;
  name: string;
  grantorAddress: string;
  beneficiaryAddress: string;
  vaultIndex: number;
  vaultAddress: string;
  status: "pending_funding" | "active" | "succession_triggered" | "paused" | "completed" | string;
  isRevocable: boolean;
  corpusFunded: boolean;
  heartbeatWindowSeconds: number | string;
  lastHeartbeatAt?: string;
  heartbeatDeadline?: string;
  createdAt: string;
}

function normalizeTrust(raw: any): NormalizedTrust {
  return {
    id: raw.id,
    name: raw.name || "Unnamed Trust",
    grantorAddress: raw.grantorAddress || raw.grantor_address || "",
    beneficiaryAddress: raw.beneficiaryAddress || raw.beneficiary_address || "",
    vaultIndex: raw.vaultIndex ?? raw.vault_index ?? 0,
    vaultAddress: raw.vaultAddress || raw.vault_address || "",
    status: raw.status || "active",
    isRevocable: raw.isRevocable ?? raw.is_revocable ?? true,
    corpusFunded: raw.corpusFunded ?? raw.corpus_funded ?? false,
    heartbeatWindowSeconds: raw.heartbeatWindowSeconds || raw.heartbeat_window_seconds || 2592000,
    lastHeartbeatAt: raw.lastHeartbeatAt || raw.last_heartbeat_at,
    heartbeatDeadline: raw.heartbeatDeadline || raw.heartbeat_deadline,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

function shortenAddress(addr?: string) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(isoStr?: string) {
  if (!isoStr) return "N/A";
  try {
    return new Date(isoStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const [trusts, setTrusts] = useState<NormalizedTrust[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState(false);

  const loadTrusts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let results: NormalizedTrust[] = [];

      if (isConnected && address) {
        // Fetch trusts created by user (Grantor) and trusts where user is Beneficiary
        const [grantorList, beneficiaryList] = await Promise.all([
          fetchGrantorTrusts(address),
          fetchBeneficiaryTrusts(address),
        ]);

        const combined = [...grantorList, ...beneficiaryList];
        const seen = new Set<string>();
        for (const item of combined) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            results.push(normalizeTrust(item));
          }
        }
      }

      // If no trusts found for user yet or wallet not connected, query public on-chain trusts
      if (results.length === 0) {
        const publicTrusts = await fetchAllTrusts(20);
        results = publicTrusts.map(normalizeTrust);
      }

      setTrusts(results);
    } catch (e: any) {
      console.error("Error loading trusts:", e);
      setError(e.message || "Failed to load on-chain trusts from Robinhood Chain.");
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    loadTrusts();
  }, [loadTrusts]);

  // Filtering
  const filtered = trusts.filter((t) => {
    const matchesQuery =
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.beneficiaryAddress.toLowerCase().includes(query.toLowerCase()) ||
      t.grantorAddress.toLowerCase().includes(query.toLowerCase()) ||
      t.vaultAddress.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (filter === "all") return true;
    if (filter === "grantor") {
      return address && t.grantorAddress.toLowerCase() === address.toLowerCase();
    }
    if (filter === "beneficiary") {
      return address && t.beneficiaryAddress.toLowerCase() === address.toLowerCase();
    }
    if (filter === "active") return t.status === "active";
    if (filter === "pending_funding") return t.status === "pending_funding";
    if (filter === "succession_triggered") return t.status === "succession_triggered";
    if (filter === "paused") return t.status === "paused";

    return true;
  });

  const uniqueBeneficiaries = new Set(trusts.map((t) => t.beneficiaryAddress.toLowerCase())).size;

  return (
    <div className="shell">
      <DemoNotice />

      <div className="workspace-title">
        <div>
          <p className="eyebrow">YOUR ON-CHAIN TRUST WORKSPACE</p>
          <h1 className="product-title">For all their tomorrows.</h1>
          <p className="product-description">
            Non-custodial tokenized stock trusts powered by Robinhood Chain.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="button primary" to="/create">
            <Plus size={15} /> Create a trust
          </Link>
        </div>
      </div>

      {/* Network & Wallet Status Bar */}
      {!isConnected && (
        <div className="mb-6 rounded-lg border border-[#d8dee0] bg-[#eae5dc] p-4 text-sm text-[#152a3b] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#d5cdbf] p-2 text-[#152c41]">
              <Wallet size={18} />
            </div>
            <div>
              <p className="font-medium text-[#152c41]">Connect your Robinhood Chain wallet</p>
              <p className="text-xs text-[#6b7c88]">
                Connect to view your grantor vaults, sign off-chain heartbeats, and claim beneficiary inheritances.
              </p>
            </div>
          </div>
          <ConnectButton />
        </div>
      )}

      {/* Workspace Stats */}
      <div className="workspace-stats">
        <div>
          <span>On-chain Trusts</span>
          <strong>
            {String(trusts.length).padStart(2, "0")}
          </strong>
          <span>Live across Robinhood Chain</span>
        </div>
        <div>
          <span>Robinhood Chain L2</span>
          <strong>
            4663
          </strong>
          <span>EVM Nitro · Fast finality</span>
        </div>
        <div>
          <span>Beneficiary Wallets</span>
          <strong>
            {String(uniqueBeneficiaries).padStart(2, "0")}
          </strong>
          <span>Named inheritance recipients</span>
        </div>
      </div>

      {/* Tools & Search */}
      <div className="workspace-tools">
        <div className="flex items-center gap-2">
          <h2>Trusts</h2>
          <span>{filtered.length}</span>
          <button
            onClick={loadTrusts}
            className="text-xs text-[#9d8e7d] hover:text-[#e4ded6] flex items-center gap-1 ml-2 transition"
            title="Refresh from Robinhood Chain"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <label className="search-input">
          <Search size={15} />
          <input
            aria-label="Search trusts"
            placeholder="Search by name, address, or vault…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select
          aria-label="Filter trusts by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {isConnected && <option value="grantor">Created by me (Grantor)</option>}
          {isConnected && <option value="beneficiary">Inherited by me (Beneficiary)</option>}
          <option value="active">Active (Armed)</option>
          <option value="pending_funding">Pending Funding</option>
          <option value="succession_triggered">Succession Triggered</option>
          <option value="paused">Paused</option>
        </select>

        <button
          className="icon-button"
          onClick={() => setList(!list)}
          aria-label={list ? "Show grid" : "Show list"}
        >
          {list ? <LayoutGrid size={15} /> : <Rows3 size={15} />}
        </button>
      </div>

      {error && (
        <div role="alert" className="error-message my-4 p-4 border border-rose-900/50 bg-rose-950/30 text-rose-300 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state" role="status">
          <RefreshCw size={24} className="animate-spin mb-3 text-[#c4a47c]" />
          <p>Querying Robinhood Chain trust index…</p>
        </div>
      ) : filtered.length ? (
        <div className={list ? "vault-grid list" : "vault-grid"}>
          {filtered.map((t) => {
            const isUserGrantor = address && t.grantorAddress.toLowerCase() === address.toLowerCase();
            const isUserBeneficiary = address && t.beneficiaryAddress.toLowerCase() === address.toLowerCase();

            return (
              <Link className="vault-card" to="/vault" search={{ id: t.id }} key={t.id}>
                <div className="spread">
                  <span className="avatar">
                    {t.name[0]?.toUpperCase() || "H"}
                  </span>
                  <span
                    className={`vault-status ${
                      t.status === "active"
                        ? "text-emerald-400 border-emerald-800/60 bg-emerald-950/30"
                        : t.status === "succession_triggered"
                        ? "text-rose-400 border-rose-800/60 bg-rose-950/30 font-semibold"
                        : t.status === "pending_funding"
                        ? "text-amber-400 border-amber-800/60 bg-amber-950/30"
                        : ""
                    }`}
                  >
                    {t.status === "active"
                      ? "Active · Armed"
                      : t.status === "pending_funding"
                      ? "Pending Funding"
                      : t.status === "succession_triggered"
                      ? "Succession Triggered"
                      : t.status === "paused"
                      ? "Paused"
                      : t.status}
                  </span>
                </div>

                <h3>{t.name}</h3>

                <p className="flex items-center gap-1 mt-1 text-xs">
                  {isUserGrantor && (
                    <span className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-700/40 font-medium">
                      Grantor
                    </span>
                  )}
                  {isUserBeneficiary && (
                    <span className="rounded bg-sky-900/40 px-1.5 py-0.5 text-[10px] text-sky-300 border border-sky-700/40 font-medium">
                      Beneficiary
                    </span>
                  )}
                  <span>For: {shortenAddress(t.beneficiaryAddress)}</span>
                </p>

                <strong>
                  <span className="text-xs font-mono text-[#8d7c68] block mb-1">
                    Dedicated Vault #{t.vaultIndex}
                  </span>
                  <span className="text-base font-mono tracking-tight text-[#e4ded6]">
                    {shortenAddress(t.vaultAddress)}
                  </span>
                </strong>

                <span className="micro uppercase tracking-wider text-[9px] text-[#a08a6b] mt-2 block">
                  {t.isRevocable ? "Revocable Trust" : "Irrevocable Trust"} · RHC NITRO
                </span>

                <div className="spread card-bottom mt-4">
                  <span className="text-xs">
                    <Clock3 size={12} /> Created {formatDate(t.createdAt)}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Mark />
          </span>
          <h3>
            {query || filter !== "all"
              ? "No matching trusts."
              : "Every legacy begins somewhere."}
          </h3>
          <p>
            {query || filter !== "all"
              ? "Try adjusting your search query or filter criteria."
              : "Create your first non-custodial trust fund on Robinhood Chain, or inspect a live on-chain vault."}
          </p>
          {query || filter !== "all" ? (
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          ) : (
            <div className="empty-actions">
              <Link className="button primary" to="/create">
                Create your first trust <Plus size={14} />
              </Link>
              <Link
                className="text-link"
                to="/vault"
                search={{ id: "6021ca68-654b-42c4-b588-368cdc1fca3c" }}
              >
                Inspect live verified Vault #4 <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="workspace-bottom">
        <Heart size={19} />
        <div>
          <h3>The plan is only part of the story.</h3>
          <p>A personal encrypted letter gives your portfolio enduring meaning.</p>
        </div>
        <Link className="text-link" to="/docs" hash="letters">
          Learn about letters <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
