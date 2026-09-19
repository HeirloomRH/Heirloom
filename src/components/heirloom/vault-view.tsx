import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
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
  SendHorizonal,
} from "lucide-react";
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
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


export function VaultView() {
  const search = useSearch({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const id = search.id || "sample";

  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { openAccountModal } = useAccountModal();
  const { openConnectModal } = useConnectModal();

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

  // Deposit flow state
  const [depositAsset, setDepositAsset] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>(undefined);

  const selectedAsset = realTrust?.assets.find((a) => a.symbol === depositAsset);
  const liveToken = realTrust?.liveBalances.find((b) => b.token.symbol === depositAsset)?.token;
  const tokenDecimals = liveToken?.decimals ?? (depositAsset === "USDG" || depositAsset === "USDC" ? 6 : 18);

  const { data: userTokenBalanceRaw } = useReadContract({
    address: (selectedAsset?.token_address && selectedAsset.token_address !== "0x0000000000000000000000000000000000000000")
      ? (selectedAsset.token_address as `0x${string}`)
      : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: !!address && !!selectedAsset?.token_address && selectedAsset.token_address !== "0x0000000000000000000000000000000000000000",
    },
  });

  const userTokenBalance = userTokenBalanceRaw !== undefined
    ? formatUnits(userTokenBalanceRaw, tokenDecimals)
    : undefined;

  const { writeContractAsync } = useWriteContract();
  const { data: depositReceipt, isLoading: depositWaiting } =
    useWaitForTransactionReceipt({ hash: depositTxHash, query: { enabled: !!depositTxHash } });

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

  // ERC-20 Deposit Handler
  const handleDeposit = async () => {
    if (!realTrust || !vault?.vaultAddress) return;
    if (!address) {
      setError("Connect your wallet to deposit assets.");
      return;
    }
    if (!depositAsset) {
      setError("Please select an asset to deposit.");
      return;
    }
    const amtNum = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amtNum) || amtNum <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    // Find the token contract address from realTrust.assets
    const assetInfo = realTrust.assets.find((a) => a.symbol === depositAsset);
    if (!assetInfo?.token_address || assetInfo.token_address === "0x0000000000000000000000000000000000000000") {
      setError(`No contract address found for ${depositAsset}. Contact support.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      // Parse amount with exact token decimals (e.g. 6 for USDG, 18 for equities)
      const amountWei = parseUnits(depositAmount.trim(), tokenDecimals);

      // Pre-check wallet balance to prevent reverted simulation
      if (userTokenBalanceRaw !== undefined && userTokenBalanceRaw < amountWei) {
        setError(
          `Insufficient ${depositAsset} balance. Your connected wallet holds ${
            userTokenBalance ?? "0"
          } ${depositAsset}. Acquire or transfer ${depositAsset} to your wallet before depositing.`
        );
        setBusy(false);
        return;
      }

      const txHash = await writeContractAsync({
        address: assetInfo.token_address as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [vault.vaultAddress as `0x${string}`, amountWei],
        chainId: ROBINHOOD_CHAIN_ID,
      });

      setDepositTxHash(txHash);
      setDialog("deposit_pending");
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || "Transaction failed or was rejected.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // When deposit receipt lands, mark success
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (depositReceipt && dialog === "deposit_pending") {
      setDialog("deposit_success");
      setDepositAmount("");
      // Trigger fund verification after a short delay
      setTimeout(() => {
        verifyFunding(realTrust!.trust.id).catch(() => {});
        loadData();
      }, 2000);
    }
  }, [depositReceipt]);

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
        <div className="empty-state">
          <h1 className="product-title">This trust isn't here.</h1>
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

      {/* Vault Address Card — on-brand design */}
      {vault.vaultAddress && (
        <div className="vault-address-card">
          <div className="vault-address-card-header">
            <div className="vault-address-card-title">
              <ShieldCheck size={15} />
              <span>Vault Address</span>
              <span className="vault-address-badge">#{vault.vaultIndex ?? 1}</span>
            </div>
            <div className="vault-address-card-actions">
              <button
                className="button secondary"
                onClick={() => copyAddress(vault.vaultAddress!)}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={`${ROBINHOOD_EXPLORER_URL}/address/${vault.vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                <ExternalLink size={13} /> Explorer
              </a>
              {realTrust && (
                <button
                  className="button primary"
                  onClick={() => {
                    // Pre-select first asset if none selected
                    if (!depositAsset && realTrust.assets.length > 0) {
                      setDepositAsset(realTrust.assets[0].symbol);
                    }
                    setDialog("deposit");
                  }}
                >
                  <SendHorizonal size={13} /> Deposit
                </button>
              )}
            </div>
          </div>
          <p className="vault-address-mono">{vault.vaultAddress}</p>
          {!vault.corpusFunded && (
            <div className="vault-address-funding-hint">
              <strong>Activate this trust:</strong> Deposit tokenized assets directly to this vault address to fund it. Use the <em>Deposit</em> button above, or transfer manually from your wallet.
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
              <span className="micro">Robinhood Chain</span>
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
                <Heart size={14} /> {busy ? "Signing..." : "Check In (Gasless)"}
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
                "Connect your wallet to check in or claim"
              )}
            </p>

            <div className="mt-3">
              {isConnected && address ? (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="button secondary w-full justify-center font-mono text-xs"
                >
                  {address.slice(0, 6)}…{address.slice(-4)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="button primary w-full justify-center"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Decrypted Letter Dialog */}
      {dialog === "letter" && unlockedLetter && (
        <Dialog title="Letter to the Beneficiary" onClose={() => setDialog("")}>
          <div className="dialog-body">
            <p className="whitespace-pre-line text-sm" style={{ color: "var(--ink)" }}>{unlockedLetter}</p>
          </div>
        </Dialog>
      )}

      {/* Success Notice Modal */}
      {notice && (
        <Dialog title="Success" onClose={() => setNotice("")}>
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <Check size={20} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {notice}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => setNotice("")}>
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Error Modal */}
      {error && (
        <Dialog title="Something went wrong" onClose={() => setError("")}>
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {error}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setError("")}>
                Dismiss
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Form Modal */}
      {dialog === "deposit" && realTrust && vault?.vaultAddress && (
        <Dialog title="Deposit Assets" onClose={() => setDialog("")}>
          <div className="dialog-body">
            <p className="text-sm" style={{ color: "var(--ink)", marginBottom: "1rem" }}>
              Select an asset and amount to deposit into this vault on Robinhood Chain. Your wallet will prompt you to sign the transaction.
            </p>

            <div className="deposit-field">
              <label className="deposit-label" htmlFor="deposit-asset">Asset</label>
              <select
                id="deposit-asset"
                className="deposit-select"
                value={depositAsset}
                onChange={(e) => setDepositAsset(e.target.value)}
              >
                {realTrust.assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="deposit-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="deposit-label" htmlFor="deposit-amount" style={{ marginBottom: 0 }}>
                  Amount
                </label>
                {userTokenBalance !== undefined && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink)", opacity: 0.8 }}>
                    Wallet: <strong>{Number(userTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong> {depositAsset}
                    {Number(userTokenBalance) > 0 && (
                      <button
                        type="button"
                        style={{
                          marginLeft: "8px",
                          background: "none",
                          border: "none",
                          color: "var(--ink)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "11px",
                          padding: 0,
                          fontWeight: 700,
                        }}
                        onClick={() => setDepositAmount(userTokenBalance)}
                      >
                        MAX
                      </button>
                    )}
                  </span>
                )}
              </div>
              <input
                id="deposit-amount"
                className="deposit-input"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 10.5"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              {userTokenBalanceRaw !== undefined && userTokenBalanceRaw === 0n && (
                <p style={{ fontSize: "11px", color: "#b91c1c", marginTop: "6px" }}>
                  Your connected wallet has 0 {depositAsset} on Robinhood Chain. You must fund your wallet with {depositAsset} first before depositing.
                </p>
              )}
            </div>

            <div className="deposit-destination">
              <span className="deposit-destination-label">To vault</span>
              <span className="deposit-destination-address">{vault.vaultAddress}</span>
            </div>

            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setDialog("")}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={handleDeposit}
                disabled={busy || !depositAsset || !depositAmount}
              >
                {busy ? "Sending…" : <><SendHorizonal size={14} /> Send Deposit</>}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Pending Modal */}
      {dialog === "deposit_pending" && (
        <Dialog title="Transaction Submitted" onClose={() => {}}>
          <div className="dialog-body">
            <div className="deposit-pending-state">
              <div className="deposit-spinner" />
              <p className="text-sm" style={{ color: "var(--ink)" }}>
                Your deposit transaction has been broadcast to Robinhood Chain. Waiting for confirmation…
              </p>
              {depositTxHash && (
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ marginTop: "0.75rem", fontSize: "0.78rem" }}
                >
                  <ExternalLink size={12} /> View Transaction
                </a>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Success Modal */}
      {dialog === "deposit_success" && (
        <Dialog title="Deposit Confirmed" onClose={() => setDialog("")}>
          <div className="dialog-body">
            <div className="deposit-success-state">
              <div className="success-badge" style={{ margin: "0 auto 1rem" }}>
                <Check size={22} />
              </div>
              <p className="text-sm" style={{ color: "var(--ink)", textAlign: "center", marginBottom: "0.75rem" }}>
                Your deposit of <strong>{depositAsset}</strong> was confirmed on Robinhood Chain. Your vault balances are being refreshed.
              </p>
              {depositTxHash && (
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ fontSize: "0.78rem" }}
                >
                  <ExternalLink size={12} /> View on Explorer
                </a>
              )}
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => { setDialog(""); setDepositTxHash(undefined); }}>
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
