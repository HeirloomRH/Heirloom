import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  Heart,
  Pause,
  Play,
  Trash2,
  LockKeyhole,
  ShieldCheck,
  Check,
  Clock3,
  Mail,
  Copy,
  ExternalLink,
  RefreshCw,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { useAccount, useSignTypedData } from "wagmi";
import {
  fetchTrust,
  submitHeartbeat,
  verifyFunding,
  claimVesting,
  fetchLetter,
  type TrustResponse,
} from "@/lib/api";
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from "@/lib/chain";
import { DemoNotice, Dialog } from "./product";
import { AssetIcon } from "./asset-icon";
import {
  sample,
  readVaults,
  saveVault,
  removeVault,
  exportVault,
  money,
  dateLabel,
  type Vault,
} from "@/lib/heirloom/vault";
import { ConnectButton } from "../wallet/ConnectButton";

export function VaultView() {
  const search = useSearch({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const id = search.id || "sample";

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [vault, setVault] = useState<Vault | null>(null);
  const [realTrust, setRealTrust] = useState<TrustResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("Portfolio");
  const [dialog, setDialog] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlockedLetter, setUnlockedLetter] = useState<string | null>(null);
  const [claimTx, setClaimTx] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    if (id && id !== "sample") {
      try {
        const data = await fetchTrust(id);
        setRealTrust(data);

        // Map backend trust to display vault
        const mapped: Vault = {
          id: data.trust.id,
          name: data.trust.name,
          beneficiary: "Beneficiary",
          wallet: data.trust.beneficiaryAddress,
          amount: 0,
          allocations: data.assets.map((a) => ({
            symbol: a.symbol,
            name: a.symbol + " Token",
            weight: Math.round(a.target_allocation_bps / 100),
          })),
          schedule: data.vestingSchedules.map((s) => ({
            date: s.unlock_timestamp.slice(0, 10),
            percent: Math.round(s.percentage_bps / 100),
          })),
          mode: data.trust.isRevocable ? "revocable" : "irrevocable",
          heartbeat: Math.round(Number(data.trust.heartbeatWindowSeconds) / 86400),
          guardian: data.guardians[0]?.guardian_address || "",
          letter: "",
          createdAt: data.trust.createdAt,
          lastCheckIn: data.trust.lastHeartbeatAt,
          paused: data.trust.status === "paused",
          demo: false,
          vaultAddress: data.trust.vaultAddress,
          vaultIndex: data.trust.vaultIndex,
          corpusFunded: data.trust.corpusFunded,
          heartbeatDeadline: data.trust.heartbeatDeadline,
          grantorAddress: data.trust.grantorAddress,
        };

        setVault(mapped);
      } catch (e: any) {
        console.warn("Could not fetch remote trust, checking local storage:", e);
        const local = readVaults().find((v) => v.id === id);
        if (local) {
          setVault(local);
        } else {
          setError(e.message || "Failed to load trust from Robinhood Chain.");
        }
      }
    } else {
      setVault(structuredClone(sample));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Gasless EIP-712 Heartbeat Check-In
  const handleHeartbeat = async () => {
    if (!realTrust) return;
    if (!address) {
      setError("Connect the Grantor wallet to submit a check-in.");
      return;
    }

    if (address.toLowerCase() !== realTrust.trust.grantorAddress.toLowerCase()) {
      setError("Only the Grantor wallet can check in to extend the dead-man's switch.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await signTypedDataAsync({
        domain: {
          name: "Heirloom Trust Protocol",
          version: "1",
          chainId: ROBINHOOD_CHAIN_ID,
          verifyingContract: "0x0000000000000000000000000000000000000000",
        },
        types: {
          Heartbeat: [
            { name: "trustId", type: "string" },
            { name: "grantor", type: "address" },
            { name: "timestamp", type: "uint256" },
            { name: "message", type: "string" },
          ],
        },
        primaryType: "Heartbeat",
        message: {
          trustId: realTrust.trust.id,
          grantor: realTrust.trust.grantorAddress as `0x${string}`,
          timestamp: BigInt(timestamp),
          message: "I am alive",
        },
      });

      const res = await submitHeartbeat({
        trustId: realTrust.trust.id,
        grantorAddress: address,
        timestamp,
        message: "I am alive",
        signature,
      });

      setNotice("Heartbeat confirmed! Dead-man's switch deadline extended.");
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to submit heartbeat signature.");
    } finally {
      setBusy(false);
    }
  };

  // On-Chain Funding Verification
  const handleVerifyDeposit = async () => {
    if (!realTrust) return;
    setBusy(true);
    setError("");
    try {
      const res = await verifyFunding(realTrust.trust.id);
      setNotice(res.message || "Corpus deposit verified on Robinhood Chain!");
      await loadData();
    } catch (e: any) {
      setError(e.message || "No new deposit confirmed on-chain yet.");
    } finally {
      setBusy(false);
    }
  };

  // Decrypt and view letter
  const handleUnlockLetter = async () => {
    if (!realTrust) return;
    setBusy(true);
    setError("");
    try {
      const requester = address || realTrust.trust.grantorAddress;
      const res = await fetchLetter(realTrust.trust.id, requester);
      setUnlockedLetter(res.letter);
      setDialog("letter");
    } catch (e: any) {
      setError(e.message || "Failed to unlock encrypted letter.");
    } finally {
      setBusy(false);
    }
  };

  // Beneficiary Claim
  const handleClaim = async (symbol: string, scheduleId?: string) => {
    if (!realTrust) return;
    if (!address) {
      setError("Please connect beneficiary wallet to claim.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await claimVesting({
        trustId: realTrust.trust.id,
        beneficiaryAddress: address,
        tokenSymbolOrAddress: symbol,
        scheduleId,
      });

      setClaimTx(res.txHash);
      setNotice(`Successfully claimed ${res.amount} ${res.token}! Tx: ${res.txHash.slice(0, 10)}...`);
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to execute claim payout.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="shell loading" role="status">
        Loading your trust from Robinhood Chain…
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="shell">
        <DemoNotice />
        <div className="empty-state">
          <h1 className="product-title">This trust isn’t here.</h1>
          <p>{error || "It may not exist, or the backend is unreachable."}</p>
          <Link className="button primary" to="/app">
            Back to workspace <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    );
  }

  // Calculate heartbeat days remaining
  let daysRemaining = vault.heartbeat;
  if (vault.heartbeatDeadline) {
    const diffMs = new Date(vault.heartbeatDeadline).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
  }

  const isSuccessionTriggered =
    realTrust?.trust.status === "succession_triggered" ||
    (vault.heartbeatDeadline && new Date() > new Date(vault.heartbeatDeadline));

  const isGrantor = address && realTrust && address.toLowerCase() === realTrust.trust.grantorAddress.toLowerCase();
  const isBeneficiary = address && realTrust && address.toLowerCase() === realTrust.trust.beneficiaryAddress.toLowerCase();

  return (
    <div className="shell">
      <DemoNotice />

      <div className="product-breadcrumb">
        <Link to="/app">
          <ArrowLeft size={13} /> Your workspace
        </Link>
        <span>{id === "sample" ? "SAMPLE PREVIEW" : "LIVE TRUST VAULT"}</span>
      </div>

      <div className="trust-heading">
        <div>
          <div className="trust-kicker">
            <span className="avatar">{vault.beneficiary[0]}</span>
            <span>FOR {vault.beneficiary.toUpperCase()}</span>
            <span
              className={`vault-status ${
                isSuccessionTriggered
                  ? "bg-rose-950/80 text-rose-300 border-rose-800"
                  : vault.corpusFunded
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                    : "bg-amber-950/80 text-amber-300 border-amber-800"
              }`}
            >
              {isSuccessionTriggered
                ? "Succession Triggered"
                : vault.corpusFunded
                  ? "Active & Funded"
                  : "Pending Funding"}
            </span>
          </div>
          <h1 className="product-title">{vault.name}</h1>
          <p className="product-description">
            Generational wealth, programmed in code on Robinhood Chain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {realTrust && (
            <button
              className="button secondary"
              onClick={handleVerifyDeposit}
              disabled={busy}
              title="Refresh balances from Robinhood Chain"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => {
              try {
                exportVault(vault);
                setNotice("Trust summary prepared for download.");
              } catch {
                setError("Download failed.");
              }
            }}
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {notice && (
        <div className="success-message" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Dedicated On-Chain Vault Banner */}
      {vault.vaultAddress && (
        <div className="my-4 rounded-xl border border-[#3a3229] bg-[#161310] p-4 text-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="font-semibold uppercase tracking-wider text-[#e4ded6]">
                  Dedicated On-Chain Vault Address
                </span>
                <span className="rounded bg-[#25201b] px-1.5 py-0.5 text-[10px] text-[#8d7c68]">
                  Vault #{vault.vaultIndex ?? 1}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[#c4bcaf] break-all">
                {vault.vaultAddress}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => copyAddress(vault.vaultAddress!)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#352f28] bg-[#201b17] px-2.5 py-1.5 text-xs text-[#e4ded6] transition hover:bg-[#2c251f]"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy Address"}</span>
              </button>

              <a
                href={`${ROBINHOOD_EXPLORER_URL}/address/${vault.vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#352f28] bg-[#201b17] px-2.5 py-1.5 text-xs text-[#c4a47c] transition hover:bg-[#2c251f]"
              >
                <span>Blockscout</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {!vault.corpusFunded && (
            <div className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-amber-200">
              <p className="font-medium text-amber-100">
                To activate this trust:
              </p>
              <p className="mt-0.5 text-[11px] text-amber-300/80">
                Transfer your chosen tokenized stocks (`SPCX`, `AAPL`, `NVDA`, `TSLA`) or `USDG` directly to the vault address above. Once confirmed, click "Refresh" to verify.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="trust-layout">
        <div>
          {/* Live On-Chain Portfolio Summary */}
          <div className="portfolio-summary">
            <div className="spread">
              <span className="eyebrow">ON-CHAIN HOLDINGS & RESERVES</span>
              <span className="micro">Robinhood Chain (4663)</span>
            </div>

            {realTrust ? (
              <div className="mt-2 space-y-1">
                {realTrust.liveBalances
                  .filter((b) => BigInt(b.balanceRaw) > 0n)
                  .map((b) => (
                    <div key={b.token.symbol} className="flex items-center justify-between font-mono text-sm text-[#f5efe6] py-1 border-b border-[#25201b]/40 last:border-0">
                      <div className="flex items-center gap-2">
                        <AssetIcon symbol={b.token.symbol} className="w-5 h-5" />
                        <span>{b.token.name} ({b.token.symbol})</span>
                      </div>
                      <span className="font-semibold text-emerald-400">{b.balanceFormatted} {b.token.symbol}</span>
                    </div>
                  ))}
                {realTrust.liveBalances.every((b) => BigInt(b.balanceRaw) === 0n) && (
                  <p className="font-mono text-sm text-[#8d7c68]">
                    0.00 assets currently held in vault. Pending deposit.
                  </p>
                )}
              </div>
            ) : (
              <strong>
                {money(vault.amount)}
                <span>.00</span>
              </strong>
            )}

            <div className="portfolio-summary-bottom mt-3">
              <span>{vault.allocations.length} configured assets</span>
              <span className="capitalize">
                <LockKeyhole size={12} /> {vault.mode} terms
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="trust-tabs" role="tablist" aria-label="Trust details">
            {["Portfolio", "Schedule", "Letter"].map((t) => (
              <button
                key={t}
                role="tab"
                id={"tab-" + t}
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "Letter" && (vault.letter || realTrust?.trust.hasEncryptedLetter) && (
                  <span className="tiny-square" />
                )}
              </button>
            ))}
          </div>

          <div className="trust-panel" role="tabpanel">
            {tab === "Portfolio" && (
              <>
                <div className="spread panel-title">
                  <h2>A foundation for tomorrow.</h2>
                  <span className="micro">TARGET ASSET ALLOCATIONS</span>
                </div>

                <div className="allocation-line large">
                  {vault.allocations.map((a, i) => (
                    <span
                      key={a.symbol}
                      style={{
                        width: a.weight + "%",
                        background: [
                          "#9ea881",
                          "#e0b182",
                          "#a89cb9",
                          "#8ea9af",
                          "#baa687",
                        ][i % 5],
                      }}
                    />
                  ))}
                </div>

                <table className="holdings-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Allocation</th>
                      <th>Live Vault Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vault.allocations.map((a) => {
                      const liveItem = realTrust?.liveBalances.find(
                        (b) => b.token.symbol.toUpperCase() === a.symbol.toUpperCase()
                      );

                      return (
                        <tr key={a.symbol}>
                          <td>
                            <div className="flex items-center gap-3">
                              <AssetIcon symbol={a.symbol} className="w-8 h-8" />
                              <div>
                                <b className="font-semibold text-sm">{a.symbol}</b>
                                <small className="block text-[11px] text-[#988772]">{a.name}</small>
                              </div>
                            </div>
                          </td>
                          <td>{a.weight}%</td>
                          <td className="font-mono">
                            {liveItem ? (
                              <span className={BigInt(liveItem.balanceRaw) > 0n ? "text-emerald-400 font-medium" : "text-[#8d7c68]"}>
                                {liveItem.balanceFormatted} {a.symbol}
                              </span>
                            ) : (
                              "0.00"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {tab === "Schedule" && (
              <>
                <h2>Good things, in their own time.</h2>
                <p className="field-hint">
                  Vesting cliffs unlock assets on predetermined milestone dates or upon succession.
                </p>

                <div className="release-list">
                  {vault.schedule.map((r, i) => {
                    const isPassed = new Date(r.date) <= new Date();
                    const canClaim = (isPassed || isSuccessionTriggered) && isBeneficiary;

                    return (
                      <div key={r.date} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="release-dot">{i + 1}</span>
                          <div>
                            <b>{dateLabel(r.date)}</b>
                            <span className="block text-xs text-[#8d7c68]">
                              Cliff {String(i + 1).padStart(2, "0")} · {r.percent}% of corpus
                            </span>
                          </div>
                        </div>

                        <div>
                          {canClaim ? (
                            <button
                              onClick={() => handleClaim("USDG")}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
                            >
                              <Coins size={12} /> Claim Tokens
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-[#8d7c68]">
                              {isPassed ? "Unlocked" : "Locked"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "Letter" && (
              <>
                {unlockedLetter ? (
                  <div className="trust-letter">
                    <span className="eyebrow">
                      <Mail size={12} /> DECRYPTED PERSONAL LETTER
                    </span>
                    <p className="whitespace-pre-line text-[#f5efe6]">{unlockedLetter}</p>
                  </div>
                ) : realTrust?.trust.hasEncryptedLetter ? (
                  <div className="letter-empty text-center py-6">
                    <LockKeyhole size={28} className="mx-auto text-[#c4a47c]" />
                    <h3 className="mt-2 text-base font-medium text-[#f5efe6]">
                      Personal Letter Sealed On-Chain
                    </h3>
                    <p className="mt-1 text-xs text-[#8d7c68]">
                      Encrypted with AES-256-GCM. Unlocks for the beneficiary when active or triggered.
                    </p>
                    <button
                      onClick={handleUnlockLetter}
                      disabled={busy}
                      className="button secondary mt-4"
                    >
                      <Mail size={14} /> Unlock & Read Letter
                    </button>
                  </div>
                ) : (
                  <div className="letter-empty">
                    <Mail size={25} />
                    <h3>A story still to be written.</h3>
                    <p>No personal letter was attached to this trust.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="trust-aside">
          {/* Dead-Man's Switch Heartbeat Card */}
          <div className="trust-side-card heartbeat">
            <div className="spread">
              <h3>Dead-Man's Switch</h3>
              <Heart size={17} className={isSuccessionTriggered ? "text-rose-500" : "text-emerald-400"} />
            </div>

            <strong>
              {daysRemaining} <span>days remaining</span>
            </strong>

            <p className="text-xs text-[#8d7c68]">
              {isSuccessionTriggered ? (
                <span className="text-rose-400 font-medium">
                  Heartbeat window missed. Succession plan is now active for the beneficiary.
                </span>
              ) : (
                <>
                  Window: {vault.heartbeat} days. If a check-in is missed, succession executes automatically.
                </>
              )}
            </p>

            {isGrantor && !isSuccessionTriggered && (
              <button
                className="button primary mt-2 w-full"
                onClick={handleHeartbeat}
                disabled={busy}
              >
                <Heart size={14} /> {busy ? "Signing..." : "Check In (Gasless EIP-712)"}
              </button>
            )}
          </div>

          {/* Connected Wallet Info */}
          <div className="trust-side-card">
            <div className="spread">
              <h3>Your Access</h3>
              <ShieldCheck size={16} />
            </div>

            <p className="text-xs text-[#c4bcaf]">
              {isGrantor ? (
                <span className="text-emerald-400 font-medium">You are the Grantor (Creator)</span>
              ) : isBeneficiary ? (
                <span className="text-blue-400 font-medium">You are the Beneficiary</span>
              ) : (
                "Connect wallet to check in or claim"
              )}
            </p>

            <div className="mt-2">
              <ConnectButton className="w-full justify-center" />
            </div>
          </div>
        </aside>
      </div>

      {/* Decrypted Letter Dialog */}
      {dialog === "letter" && unlockedLetter && (
        <Dialog title="Letter to the Beneficiary" onClose={() => setDialog("")}>
          <div className="p-4">
            <p className="whitespace-pre-line text-sm text-[#f5efe6]">{unlockedLetter}</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
