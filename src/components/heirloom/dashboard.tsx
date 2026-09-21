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
  Wallet,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Mark } from "./chrome";
import { Dialog } from "./product";
import { useAccount } from "wagmi";
import {
  fetchGrantorTrusts,
  fetchBeneficiaryTrusts,
  fetchAllTrusts,
} from "@/lib/api";
import { ConnectButton } from "../wallet/ConnectButton";
import { useLocale, useT } from "@/lib/i18n";

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

function normalizeTrust(raw: any, unnamedLabel: string): NormalizedTrust {
  return {
    id: raw.id,
    name: raw.name || unnamedLabel,
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

function formatDate(isoStr: string | undefined, locale: string, fallback: string) {
  if (!isoStr) return fallback;
  try {
    return new Date(isoStr).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export function Dashboard() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
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
            results.push(normalizeTrust(item, t.dashboard.unnamedTrust));
          }
        }
      }

      // If no trusts found for user yet or wallet not connected, query public on-chain trusts
      if (results.length === 0) {
        const publicTrusts = await fetchAllTrusts(20);
        results = publicTrusts.map((item) =>
          normalizeTrust(item, t.dashboard.unnamedTrust),
        );
      }

      setTrusts(results);
    } catch (e: any) {
      console.error("Error loading trusts:", e);
      setError(e.message || t.dashboard.loadError);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, t]);

  useEffect(() => {
    loadTrusts();
  }, [loadTrusts]);

  // Filtering. The callback parameter is `trust`, not `t`, so it does not
  // shadow the `t` dictionary from useT().
  const filtered = trusts.filter((trust) => {
    const matchesQuery =
      trust.name.toLowerCase().includes(query.toLowerCase()) ||
      trust.beneficiaryAddress.toLowerCase().includes(query.toLowerCase()) ||
      trust.grantorAddress.toLowerCase().includes(query.toLowerCase()) ||
      trust.vaultAddress.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (filter === "all") return true;
    if (filter === "grantor") {
      return (
        address && trust.grantorAddress.toLowerCase() === address.toLowerCase()
      );
    }
    if (filter === "beneficiary") {
      return (
        address &&
        trust.beneficiaryAddress.toLowerCase() === address.toLowerCase()
      );
    }
    if (filter === "active") return trust.status === "active";
    if (filter === "pending_funding") return trust.status === "pending_funding";
    if (filter === "succession_triggered")
      return trust.status === "succession_triggered";
    if (filter === "paused") return trust.status === "paused";

    return true;
  });

  const uniqueBeneficiaries = new Set(
    trusts.map((trust) => trust.beneficiaryAddress.toLowerCase()),
  ).size;

  return (
    <div className="shell">
      <div className="workspace-title">
        <div>
          <p className="eyebrow">{t.dashboard.eyebrow}</p>
          <h1 className="product-title">{t.dashboard.title}</h1>
          <p className="product-description">{t.dashboard.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="button primary" to="/create">
            <Plus size={15} /> {t.dashboard.createCta}
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
              <p className="font-medium text-[#152c41]">
                {t.dashboard.connectPrompt.title}
              </p>
              <p className="text-xs text-[#6b7c88]">
                {t.dashboard.connectPrompt.body}
              </p>
            </div>
          </div>
          <ConnectButton />
        </div>
      )}

      {/* Workspace Stats */}
      <div className="workspace-stats">
        <div>
          <span>{t.dashboard.stats.trustsLabel}</span>
          <strong>{String(trusts.length).padStart(2, "0")}</strong>
          <span>{t.dashboard.stats.trustsNote}</span>
        </div>
        <div>
          <span>{t.dashboard.stats.fundedLabel}</span>
          <strong>
            {String(trusts.filter((x) => x.corpusFunded).length).padStart(2, "0")}
          </strong>
          <span>{t.dashboard.stats.fundedNote}</span>
        </div>
        <div>
          <span>{t.dashboard.stats.beneficiariesLabel}</span>
          <strong>{String(uniqueBeneficiaries).padStart(2, "0")}</strong>
          <span>{t.dashboard.stats.beneficiariesNote}</span>
        </div>
      </div>

      {/* Tools & Search */}
      <div className="workspace-tools">
        <div className="flex items-center gap-2">
          <h2>{t.dashboard.tools.heading}</h2>
          <span>{filtered.length}</span>
          <button
            onClick={loadTrusts}
            className="text-xs text-[#9d8e7d] hover:text-[#e4ded6] flex items-center gap-1 ml-2 transition"
            title={t.dashboard.tools.refreshTitle}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />{" "}
            {t.dashboard.tools.refresh}
          </button>
        </div>

        <label className="search-input">
          <Search size={15} />
          <input
            aria-label={t.dashboard.tools.searchAriaLabel}
            placeholder={t.dashboard.tools.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select
          aria-label={t.dashboard.tools.filterAriaLabel}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t.dashboard.filters.all}</option>
          {isConnected && (
            <option value="grantor">{t.dashboard.filters.grantor}</option>
          )}
          {isConnected && (
            <option value="beneficiary">
              {t.dashboard.filters.beneficiary}
            </option>
          )}
          <option value="active">{t.dashboard.filters.active}</option>
          <option value="pending_funding">
            {t.dashboard.filters.pendingFunding}
          </option>
          <option value="succession_triggered">
            {t.dashboard.filters.successionTriggered}
          </option>
          <option value="paused">{t.dashboard.filters.paused}</option>
        </select>

        <button
          className="icon-button"
          onClick={() => setList(!list)}
          aria-label={
            list ? t.dashboard.tools.showGrid : t.dashboard.tools.showList
          }
        >
          {list ? <LayoutGrid size={15} /> : <Rows3 size={15} />}
        </button>
      </div>

      {loading ? (
        <div className="empty-state" role="status">
          <RefreshCw size={24} className="animate-spin mb-3 text-[#c4a47c]" />
          <p>{t.dashboard.loading}</p>
        </div>
      ) : filtered.length ? (
        <div className={list ? "vault-grid list" : "vault-grid"}>
          {filtered.map((trust) => {
            const isUserGrantor =
              address &&
              trust.grantorAddress.toLowerCase() === address.toLowerCase();
            const isUserBeneficiary =
              address &&
              trust.beneficiaryAddress.toLowerCase() === address.toLowerCase();
            const statusLabel =
              trust.status === "active"
                ? t.dashboard.status.active
                : trust.status === "pending_funding"
                ? t.dashboard.status.pendingFunding
                : trust.status === "succession_triggered"
                ? t.dashboard.status.successionTriggered
                : trust.status === "paused"
                ? t.dashboard.status.paused
                : trust.status;

            return (
              <Link
                className="vault-card"
                to="/vault"
                search={{ id: trust.id }}
                key={trust.id}
              >
                <div className="spread">
                  <span className="avatar">
                    {trust.name[0]?.toUpperCase() || "H"}
                  </span>
                  <span
                    className={`vault-status ${
                      trust.status === "active"
                        ? "text-emerald-400 border-emerald-800/60 bg-emerald-950/30"
                        : trust.status === "succession_triggered"
                        ? "text-rose-400 border-rose-800/60 bg-rose-950/30 font-semibold"
                        : trust.status === "pending_funding"
                        ? "text-amber-400 border-amber-800/60 bg-amber-950/30"
                        : ""
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <h3>{trust.name}</h3>

                <p className="flex items-center gap-1 mt-1 text-xs">
                  {isUserGrantor && (
                    <span className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-700/40 font-medium">
                      {t.dashboard.card.grantorBadge}
                    </span>
                  )}
                  {isUserBeneficiary && (
                    <span className="rounded bg-sky-900/40 px-1.5 py-0.5 text-[10px] text-sky-300 border border-sky-700/40 font-medium">
                      {t.dashboard.card.beneficiaryBadge}
                    </span>
                  )}
                  <span>
                    {t.dashboard.card.forPrefix}{" "}
                    {shortenAddress(trust.beneficiaryAddress)}
                  </span>
                </p>

                <strong>
                  <span className="text-xs font-mono text-[#8d7c68] block mb-1">
                    {t.dashboard.card.dedicatedVault(trust.vaultIndex)}
                  </span>
                  <span className="text-base font-mono tracking-tight text-[#e4ded6]">
                    {shortenAddress(trust.vaultAddress)}
                  </span>
                </strong>

                <span className="micro uppercase tracking-wider text-[9px] text-[#a08a6b] mt-2 block">
                  {trust.isRevocable
                    ? t.dashboard.card.revocable
                    : t.dashboard.card.irrevocable}{" "}
                  · Robinhood Chain
                </span>

                <div className="spread card-bottom mt-4">
                  <span className="text-xs">
                    <Clock3 size={12} /> {t.dashboard.card.createdPrefix}{" "}
                    {formatDate(
                      trust.createdAt,
                      dateLocale,
                      t.dashboard.notAvailable,
                    )}
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
              ? t.dashboard.empty.noMatchTitle
              : t.dashboard.empty.firstTitle}
          </h3>
          <p>
            {query || filter !== "all"
              ? t.dashboard.empty.noMatchBody
              : t.dashboard.empty.firstBody}
          </p>
          {query || filter !== "all" ? (
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              {t.dashboard.empty.clearFilters}
            </button>
          ) : (
            <div className="empty-actions">
              <Link className="button primary" to="/create">
                {t.dashboard.empty.firstCta} <Plus size={14} />
              </Link>
              <Link
                className="text-link"
                to="/vault"
                search={{ id: "6021ca68-654b-42c4-b588-368cdc1fca3c" }}
              >
                {t.dashboard.empty.inspectCta} <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="workspace-bottom">
        <Heart size={19} />
        <div>
          <h3>{t.dashboard.bottom.title}</h3>
          <p>{t.dashboard.bottom.body}</p>
        </div>
        <Link className="text-link" to="/docs" hash="letters">
          {t.dashboard.bottom.cta} <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Error Modal */}
      {error && (
        <Dialog
          title={t.dashboard.errorDialog.title}
          onClose={() => setError("")}
        >
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {error}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setError("")}>
                {t.dashboard.errorDialog.dismiss}
              </button>
              <button className="button primary" onClick={loadTrusts}>
                {t.dashboard.errorDialog.retry}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
