import { useState, useEffect, useMemo } from "react";
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
  LockOpen,
  Calendar,
  Split,
} from "lucide-react";
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance, usePublicClient } from "wagmi";
import { parseUnits, parseEther, formatUnits, formatEther, erc20Abi } from "viem";
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
import { useT } from "@/lib/i18n";
import { planBasketDeposit } from "@/lib/heirloom/basket.mjs";
import type { BasketPlan, BasketQuote } from "@/lib/heirloom/basket.mjs";
import {
  checkRouterAvailability,
  quoteBasketLegs,
  buildBasketDepositRequest,
  type RouterAvailability,
} from "@/lib/heirloom/swap-router";


// Tab identity is a stable key; only the label is translated.
const TAB_KEYS = ["portfolio", "schedule", "letter"] as const;
type TabKey = (typeof TAB_KEYS)[number];

type ScheduleCopy = ReturnType<typeof useT>["vault"]["schedule"];

function getRelTime(dateStr: string, copy: ScheduleCopy): string {
  try {
    const target = new Date(dateStr + "T00:00:00Z");
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    if (diffDays <= 0) return copy.milestoneReached;
    if (diffDays < 30) return copy.inDays(diffDays);
    const diffMonths = Math.ceil(diffDays / 30);
    if (diffMonths < 12) return copy.inMonths(diffMonths);
    const diffYears = (diffDays / 365).toFixed(1);
    return copy.inYears(diffYears.replace(".0", ""));
  } catch {
    return "";
  }
}

export function VaultView() {
  const t = useT();
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
  const [tab, setTab] = useState<TabKey>("portfolio");
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

  // --- Atomic basket deposit (pay once in ETH, land the whole basket) ---
  const [depositMode, setDepositMode] = useState<"direct" | "basket">("direct");
  const [slippageBps, setSlippageBps] = useState(100); // 1.0%, per spec
  const [routerStatus, setRouterStatus] = useState<RouterAvailability | null>(null);
  const [basketQuotes, setBasketQuotes] = useState<Record<string, BasketQuote>>({});
  const [quoting, setQuoting] = useState(false);

  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });

  const { data: nativeBalance } = useBalance({
    address,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: !!address },
  });

  // Leave headroom for gas so "MAX" cannot produce a transaction that could
  // never be included.
  const GAS_RESERVE_WEI = parseEther("0.001");
  const maxBasketEth =
    nativeBalance && nativeBalance.value > GAS_RESERVE_WEI
      ? formatEther(nativeBalance.value - GAS_RESERVE_WEI)
      : "0";

  const decimalsFor = (symbol: string) =>
    realTrust?.liveBalances.find((b) => b.token.symbol === symbol)?.token.decimals ??
    (symbol === "USDG" || symbol === "USDC" ? 6 : 18);

  // The trust's target allocations, in the shape the planner expects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const basketLegs = useMemo(
    () =>
      (realTrust?.assets ?? []).map((a) => ({
        symbol: a.symbol,
        bps: a.target_allocation_bps,
        tokenAddress: a.token_address,
        decimals: decimalsFor(a.symbol),
      })),
    [realTrust],
  );

  const basketPlan = useMemo<BasketPlan | null>(() => {
    const amount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) return null;
    let totalWei: bigint;
    try {
      totalWei = parseEther(depositAmount.trim());
    } catch {
      return null;
    }
    return planBasketDeposit({
      totalWei,
      legs: basketLegs,
      quotes: basketQuotes,
      slippageBps,
      inputSymbol: "ETH",
      fallbackSymbol: "USDG",
    }) as BasketPlan;
  }, [depositAmount, basketLegs, basketQuotes, slippageBps]);

  // Confirm the venue exists before the UI offers to spend anyone's ETH.
  useEffect(() => {
    if (dialog !== "deposit" || depositMode !== "basket" || !publicClient) return;
    let cancelled = false;
    setRouterStatus(null);
    checkRouterAvailability(publicClient).then((status) => {
      if (!cancelled) setRouterStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [dialog, depositMode, publicClient]);

  // Re-quote once the amount settles. Legs are quoted off the planned split, so
  // the numbers on screen are the ones that get encoded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dialog !== "deposit" || depositMode !== "basket") return;
    if (!publicClient || !routerStatus?.available || !basketPlan || basketPlan.error)
      return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const quotes = await quoteBasketLegs(
          publicClient,
          basketPlan.legs
            .filter((leg) => leg.route !== "passthrough" && !!leg.tokenAddress)
            .map((leg) => ({
              symbol: leg.symbol,
              tokenAddress: leg.tokenAddress as `0x${string}`,
              decimals: leg.decimals,
              amountIn: leg.amountIn,
            })),
        );
        if (!cancelled) setBasketQuotes(quotes);
      } catch {
        if (!cancelled) setBasketQuotes({});
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Depends on the split, not on the quote map that the split produces.
  }, [dialog, depositMode, publicClient, routerStatus, depositAmount, slippageBps]);

  // Planner and validator codes share the vault error dictionary.
  const codeToMessage = (code: string): string => {
    const messages = t.vault.errors as unknown as Record<string, unknown>;
    const message = messages[code];
    return typeof message === "string" ? message : t.vault.errors.txFailed;
  };

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
          beneficiary: t.vault.beneficiaryFallback,
          wallet: data.trust.beneficiaryAddress,
          amount: 0,
          allocations: data.assets.map((a) => ({
            symbol: a.symbol,
            name: a.symbol + t.vault.tokenSuffix,
            weight: Math.round(a.target_allocation_bps / 100),
          })),
          schedule: data.vestingSchedules.map((s) => ({
            id: s.id,
            date: s.unlock_timestamp.slice(0, 10),
            percent: Math.round(s.percentage_bps / 100),
            claimed: s.claimed,
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
          setError(e.message || t.vault.errors.loadFailed);
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
      setError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!depositAsset) {
      setError(t.vault.errors.selectAsset);
      return;
    }
    const amtNum = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amtNum) || amtNum <= 0) {
      setError(t.vault.errors.invalidAmount);
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
      const msg = e?.shortMessage || e?.message || t.vault.errors.txFailed;
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // Atomic Basket Deposit Handler — native ETH in, whole basket out
  const handleBasketDeposit = async () => {
    if (!realTrust || !vault?.vaultAddress) return;
    if (!address) {
      setError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!basketPlan) {
      setError(t.vault.errors.invalidAmount);
      return;
    }
    if (basketPlan.error) {
      setError(codeToMessage(basketPlan.error));
      return;
    }
    // Never arm a payable transaction against a venue that is not live.
    if (!routerStatus?.available) {
      setError(t.vault.errors.routerUnavailable);
      return;
    }
    if (!basketPlan.fullyQuoted) {
      setError(t.vault.errors.quotesRequired);
      return;
    }
    if (
      nativeBalance !== undefined &&
      nativeBalance.value < basketPlan.totalWei + GAS_RESERVE_WEI
    ) {
      setError(t.vault.errors.insufficientEth(formatEther(nativeBalance.value)));
      return;
    }

    setBusy(true);
    setError("");
    try {
      // No refund recipient: SwapRouter02's refundETH always pays msg.sender,
      // which is the grantor signing this transaction.
      const request = buildBasketDepositRequest({
        plan: basketPlan,
        recipient: vault.vaultAddress as `0x${string}`,
      });

      const txHash = await writeContractAsync({
        ...request,
        chainId: ROBINHOOD_CHAIN_ID,
      });

      setDepositTxHash(txHash);
      setDialog("deposit_pending");
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string };
      setError(err.shortMessage || err.message || t.vault.errors.txFailed);
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
      setError(t.vault.errors.connectGrantor);
      return;
    }

    if (address.toLowerCase() !== realTrust.trust.grantorAddress.toLowerCase()) {
      setError(t.vault.errors.onlyGrantor);
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

      setNotice(t.vault.success.heartbeat);
      await loadData();
    } catch (e: any) {
      setError(e.message || t.vault.errors.heartbeatFailed);
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
      setNotice(res.message || t.vault.success.depositVerified);
      await loadData();
    } catch (e: any) {
      setError(e.message || t.vault.errors.noDeposit);
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
      setError(e.message || t.vault.errors.unlockFailed);
    } finally {
      setBusy(false);
    }
  };

  // Beneficiary Claim
  const handleClaim = async (symbol: string, scheduleId?: string) => {
    if (!realTrust) return;
    if (!address) {
      setError(t.vault.errors.connectBeneficiary);
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
      setError(e.message || t.vault.errors.claimFailed);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="shell loading" role="status">
        {t.vault.loading}
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="shell">
        <div className="empty-state">
          <h1 className="product-title">{t.vault.notFoundTitle}</h1>
          <p>{error || t.vault.notFoundBody}</p>
          <Link className="button primary" to="/app">
            {t.vault.backToWorkspace} <ArrowLeft size={15} />
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
          <ArrowLeft size={13} /> {t.vault.breadcrumbBack}
        </Link>
        <span>
          {id === "sample"
            ? t.vault.breadcrumbSample
            : t.vault.breadcrumbLive}
        </span>
      </div>

      <div className="trust-heading">
        <div>
          <div className="trust-kicker">
            <span className="avatar">{vault.beneficiary[0]}</span>
            <span>{t.vault.forPrefix(vault.beneficiary.toUpperCase())}</span>
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
                ? t.vault.status.successionTriggered
                : vault.corpusFunded
                  ? t.vault.status.activeFunded
                  : t.vault.status.pendingFunding}
            </span>
          </div>
          <h1 className="product-title">{vault.name}</h1>
          <p className="product-description">{t.vault.tagline}</p>
        </div>

        <div className="flex items-center gap-2">
          {realTrust && (
            <button
              className="button secondary"
              onClick={handleVerifyDeposit}
              disabled={busy}
              title={t.vault.refreshTitle}
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />{" "}
              {t.vault.refresh}
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => {
              try {
                exportVault(vault);
                setNotice(t.vault.exportSuccess);
              } catch {
                setError(t.vault.exportFailed);
              }
            }}
          >
            <Download size={14} /> {t.vault.export}
          </button>
        </div>
      </div>

      {/* Vault Address Card — on-brand design */}
      {vault.vaultAddress && (
        <div className="vault-address-card">
          <div className="vault-address-card-header">
            <div className="vault-address-card-title">
              <ShieldCheck size={15} />
              <span>{t.vault.addressCard.title}</span>
              <span className="vault-address-badge">#{vault.vaultIndex ?? 1}</span>
            </div>
            <div className="vault-address-card-actions">
              <button
                className="button secondary"
                onClick={() => copyAddress(vault.vaultAddress!)}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? t.vault.addressCard.copied : t.vault.addressCard.copy}
              </button>
              <a
                href={`${ROBINHOOD_EXPLORER_URL}/address/${vault.vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                <ExternalLink size={13} /> {t.vault.addressCard.explorer}
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
                  <SendHorizonal size={13} /> {t.vault.addressCard.deposit}
                </button>
              )}
            </div>
          </div>
          <p className="vault-address-mono">{vault.vaultAddress}</p>
          {!vault.corpusFunded && (
            <div className="vault-address-funding-hint">
              <strong>{t.vault.addressCard.activateLead}</strong>{" "}
              {t.vault.addressCard.activateBody}
            </div>
          )}
        </div>
      )}

      <div className="trust-layout">
        <div>
          {/* Live On-Chain Portfolio Summary */}
          <div className="portfolio-summary">
            <div className="spread">
              <span className="eyebrow">{t.vault.summary.eyebrow}</span>
            </div>

            {realTrust ? (
              <div className="mt-3 space-y-2">
                {realTrust.liveBalances
                  .filter((b) => BigInt(b.balanceRaw) > 0n)
                  .map((b) => (
                    <div
                      key={b.token.symbol}
                      className="flex items-center justify-between font-mono text-sm py-2 border-b border-[#d7c9b3] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <AssetIcon symbol={b.token.symbol} className="w-5 h-5" />
                        <span className="font-semibold" style={{ color: "var(--ink)" }}>
                          {b.token.name} <span style={{ color: "#7b6c56", fontWeight: 400 }}>({b.token.symbol})</span>
                        </span>
                      </div>
                      <span className="font-semibold" style={{ color: "#047857" }}>
                        {b.balanceFormatted} {b.token.symbol}
                      </span>
                    </div>
                  ))}
                {realTrust.liveBalances.every((b) => BigInt(b.balanceRaw) === 0n) && (
                  <p className="font-mono text-sm" style={{ color: "#7b6c56" }}>
                    {t.vault.summary.noAssets}
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
              <span>
                {t.vault.summary.configuredAssets(vault.allocations.length)}
              </span>
              <span>
                <LockKeyhole size={12} />{" "}
                {vault.mode === "revocable"
                  ? t.vault.summary.termsRevocable
                  : t.vault.summary.termsIrrevocable}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="trust-tabs"
            role="tablist"
            aria-label={t.vault.tabsAriaLabel}
          >
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                role="tab"
                id={"tab-" + key}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
              >
                {t.vault.tabs[key]}
                {key === "letter" &&
                  (vault.letter || realTrust?.trust.hasEncryptedLetter) && (
                    <span className="tiny-square" />
                  )}
              </button>
            ))}
          </div>

          <div className="trust-panel" role="tabpanel">
            {tab === "portfolio" && (
              <>
                <div className="spread panel-title">
                  <h2>{t.vault.portfolio.title}</h2>
                  <span className="micro">{t.vault.portfolio.micro}</span>
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
                      <th>{t.vault.portfolio.colAsset}</th>
                      <th>{t.vault.portfolio.colAllocation}</th>
                      <th>{t.vault.portfolio.colBalance}</th>
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

            {tab === "schedule" && (
              <>
                <div className="spread panel-title">
                  <h2>{t.vault.schedule.title}</h2>
                  <span className="micro">{t.vault.schedule.micro}</span>
                </div>
                <p className="field-hint" style={{ marginTop: "-6px", marginBottom: "16px" }}>
                  {t.vault.schedule.hint}
                </p>

                {/* Multi-segment allocation line matching Portfolio design */}
                <div className="allocation-line large" style={{ marginBottom: "22px" }}>
                  {vault.schedule.map((r, i) => {
                    const isPassed = new Date(r.date) <= new Date();
                    return (
                      <span
                        key={r.date + i}
                        style={{
                          width: r.percent + "%",
                          background: r.claimed
                            ? "#059669"
                            : isPassed
                            ? "#10b981"
                            : ["#9ea881", "#e0b182", "#a89cb9", "#8ea9af"][i % 4],
                          opacity: r.claimed || isPassed ? 1 : 0.85,
                        }}
                        title={t.vault.schedule.cliffTooltip(
                          "0" + (i + 1),
                          r.percent,
                          dateLabel(r.date),
                        )}
                      />
                    );
                  })}
                </div>

                {/* Milestone Cards List */}
                <div className="cliff-card-list">
                  {vault.schedule.map((r, i) => {
                    const isPassed = new Date(r.date) <= new Date();
                    const isClaimed = !!r.claimed;
                    const canClaim = (isPassed || isSuccessionTriggered) && isBeneficiary && !isClaimed;
                    const fundedBalances = realTrust?.liveBalances.filter((b) => BigInt(b.balanceRaw) > 0n) || [];
                    const claimTokenSymbol = fundedBalances[0]?.token.symbol || "USDG";

                    return (
                      <div
                        key={r.id || r.date + i}
                        className={`cliff-card ${isPassed || isClaimed ? "cliff-card-unlocked" : ""}`}
                      >
                        <div className="cliff-card-header">
                          <div className="cliff-header-left">
                            <span className="cliff-number-badge">
                              {t.vault.schedule.cliffBadge(
                                String(i + 1).padStart(2, "0"),
                              )}
                            </span>
                            <h3 className="cliff-date-title">{dateLabel(r.date)}</h3>
                            <span className="cliff-rel-time">
                              {isClaimed
                                ? t.vault.schedule.transferred
                                : isPassed
                                ? t.vault.schedule.reachedUnlocked
                                : getRelTime(r.date, t.vault.schedule)}
                            </span>
                          </div>

                          <div className="cliff-header-right">
                            {isClaimed ? (
                              <span className="cliff-status-pill claimed">
                                <Check size={13} /> {t.vault.schedule.claimed}
                              </span>
                            ) : canClaim ? (
                              <button
                                onClick={() => handleClaim(claimTokenSymbol, r.id)}
                                disabled={busy}
                                className="button primary"
                                style={{ padding: "6px 14px", fontSize: "11px" }}
                              >
                                <Coins size={13} />{" "}
                                {t.vault.schedule.claimMilestone}
                              </button>
                            ) : isPassed ? (
                              <span className="cliff-status-pill unlocked">
                                <LockOpen size={13} /> {t.vault.schedule.unlocked}
                              </span>
                            ) : (
                              <span className="cliff-status-pill locked">
                                <LockKeyhole size={13} /> {t.vault.schedule.locked}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="cliff-details-grid">
                          <div className="cliff-metric-col">
                            <span className="cliff-metric-label">
                              {t.vault.schedule.corpusShare}
                            </span>
                            <strong className="cliff-metric-value">{r.percent}%</strong>
                            <span className="cliff-metric-sub">
                              {t.vault.schedule.corpusShareSub}
                            </span>
                          </div>

                          <div className="cliff-metric-col">
                            <span className="cliff-metric-label">
                              {t.vault.schedule.tokenRelease}
                            </span>
                            {fundedBalances.length > 0 ? (
                              <div className="cliff-token-badges">
                                {fundedBalances.map((b) => {
                                  const totalAmt = parseFloat(b.balanceFormatted);
                                  const cliffAmt = (totalAmt * r.percent) / 100;
                                  return (
                                    <span key={b.token.symbol} className="cliff-token-chip">
                                      <AssetIcon symbol={b.token.symbol} className="w-4 h-4" />
                                      <span>
                                        <strong>
                                          {cliffAmt.toLocaleString(undefined, {
                                            maximumFractionDigits: 4,
                                          })}
                                        </strong>{" "}
                                        {b.token.symbol}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="cliff-token-pending">
                                {vault.amount > 0
                                  ? t.vault.schedule.pendingDepositWithAmount(
                                      money((vault.amount * r.percent) / 100),
                                    )
                                  : t.vault.schedule.pendingDeposit}
                              </span>
                            )}
                          </div>

                          <div className="cliff-metric-col">
                            <span className="cliff-metric-label">
                              {t.vault.schedule.releaseTrigger}
                            </span>
                            <p className="cliff-trigger-text">
                              {isPassed
                                ? t.vault.schedule.triggerReached
                                : t.vault.schedule.triggerPending}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "letter" && (
              <>
                {unlockedLetter ? (
                  <div className="trust-letter">
                    <span className="eyebrow">
                      <Mail size={12} /> {t.vault.letter.decryptedEyebrow}
                    </span>
                    <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--ink)" }}>{unlockedLetter}</p>
                  </div>
                ) : realTrust?.trust.hasEncryptedLetter ? (
                  <div className="letter-empty text-center py-6">
                    <LockKeyhole size={28} className="mx-auto text-[#c4a47c]" />
                    <h3 className="mt-2 text-base font-medium" style={{ color: "var(--ink)" }}>
                      {t.vault.letter.sealedTitle}
                    </h3>
                    <p className="mt-1 text-xs text-[#8d7c68]">
                      {t.vault.letter.sealedBody}
                    </p>
                    <button
                      onClick={handleUnlockLetter}
                      disabled={busy}
                      className="button secondary mt-4"
                    >
                      <Mail size={14} /> {t.vault.letter.unlockCta}
                    </button>
                  </div>
                ) : (
                  <div className="letter-empty">
                    <Mail size={25} />
                    <h3>{t.vault.letter.emptyTitle}</h3>
                    <p>{t.vault.letter.emptyBody}</p>
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
              <h3>{t.vault.heartbeat.title}</h3>
              <Heart size={17} className={isSuccessionTriggered ? "text-rose-500" : "text-emerald-400"} />
            </div>

            <strong>
              {daysRemaining} <span>{t.vault.heartbeat.daysRemaining}</span>
            </strong>

            <p className="text-xs text-[#8d7c68]">
              {isSuccessionTriggered ? (
                <span className="text-rose-400 font-medium">
                  {t.vault.heartbeat.missed}
                </span>
              ) : (
                <>{t.vault.heartbeat.window(vault.heartbeat)}</>
              )}
            </p>

            {isGrantor && !isSuccessionTriggered && (
              <button
                className="button primary mt-2 w-full"
                onClick={handleHeartbeat}
                disabled={busy}
              >
                <Heart size={14} />{" "}
                {busy ? t.vault.heartbeat.signing : t.vault.heartbeat.checkIn}
              </button>
            )}
          </div>

          {/* Connected Wallet Info */}
          <div className="trust-side-card">
            <div className="spread">
              <h3>{t.vault.access.title}</h3>
              <ShieldCheck size={16} />
            </div>

            <p className="text-xs text-[#c4bcaf]">
              {isGrantor ? (
                <span className="text-emerald-400 font-medium">
                  {t.vault.access.isGrantor}
                </span>
              ) : isBeneficiary ? (
                <span className="text-blue-400 font-medium">
                  {t.vault.access.isBeneficiary}
                </span>
              ) : (
                t.vault.access.connectPrompt
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
                  {t.vault.access.connectWallet}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Decrypted Letter Dialog */}
      {dialog === "letter" && unlockedLetter && (
        <Dialog
          title={t.vault.letter.dialogTitle}
          onClose={() => setDialog("")}
        >
          <div className="dialog-body">
            <p className="whitespace-pre-line text-sm" style={{ color: "var(--ink)" }}>{unlockedLetter}</p>
          </div>
        </Dialog>
      )}

      {/* Success Notice Modal */}
      {notice && (
        <Dialog title={t.vault.notices.successTitle} onClose={() => setNotice("")}>
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <Check size={20} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {notice}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => setNotice("")}>
                {t.vault.notices.done}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Error Modal */}
      {error && (
        <Dialog title={t.vault.notices.errorTitle} onClose={() => setError("")}>
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {error}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setError("")}>
                {t.vault.notices.dismiss}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Form Modal */}
      {dialog === "deposit" && realTrust && vault?.vaultAddress && (
        <Dialog title={t.vault.deposit.title} onClose={() => setDialog("")}>
          <div className="dialog-body">
            <div
              className="deposit-mode"
              role="radiogroup"
              aria-label={t.vault.deposit.modeLabel}
            >
              <button
                type="button"
                role="radio"
                aria-checked={depositMode === "direct"}
                className={depositMode === "direct" ? "is-active" : ""}
                onClick={() => setDepositMode("direct")}
              >
                <SendHorizonal size={15} />
                <span>{t.vault.deposit.modeDirect}</span>
                <small>{t.vault.deposit.modeDirectHint}</small>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={depositMode === "basket"}
                className={depositMode === "basket" ? "is-active" : ""}
                onClick={() => setDepositMode("basket")}
              >
                <Split size={15} />
                <span>{t.vault.deposit.modeBasket}</span>
                <small>{t.vault.deposit.modeBasketHint}</small>
              </button>
            </div>

            {depositMode === "direct" ? (
              <>
            <p className="text-sm" style={{ color: "var(--ink)", marginBottom: "1rem" }}>
              {t.vault.deposit.intro}
            </p>

            <div className="deposit-field">
              <label className="deposit-label" htmlFor="deposit-asset">
                {t.vault.deposit.assetLabel}
              </label>
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
                  {t.vault.deposit.amountLabel}
                </label>
                {userTokenBalance !== undefined && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink)", opacity: 0.8 }}>
                    {t.vault.deposit.walletPrefix}{" "}
                    <strong>{Number(userTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong> {depositAsset}
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
                        {t.vault.deposit.max}
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
                placeholder={t.vault.deposit.amountPlaceholder}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              {userTokenBalanceRaw !== undefined && userTokenBalanceRaw === 0n && (
                <p style={{ fontSize: "11px", color: "#b91c1c", marginTop: "6px" }}>
                  {t.vault.deposit.zeroBalance(depositAsset)}
                </p>
              )}
            </div>

              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--ink)", marginBottom: "1rem" }}>
                  {t.vault.deposit.basketIntro}
                </p>

                {routerStatus && !routerStatus.available && (
                  <div className="deposit-router-warning" role="status">
                    <AlertTriangle size={16} />
                    <div>
                      <strong>{t.vault.deposit.routerUnavailableTitle}</strong>
                      <p>
                        {routerStatus.reason === "router_missing"
                          ? t.vault.deposit.routerUnavailableRouter
                          : routerStatus.reason === "quoter_missing"
                            ? t.vault.deposit.routerUnavailableQuoter
                            : t.vault.deposit.routerUnavailableProbe}
                      </p>
                      <button
                        type="button"
                        className="deposit-router-switch"
                        onClick={() => setDepositMode("direct")}
                      >
                        {t.vault.deposit.routerUnavailableAction}
                      </button>
                    </div>
                  </div>
                )}

                <div className="deposit-field">
                  <div className="deposit-field-head">
                    <label className="deposit-label" htmlFor="basket-amount">
                      {t.vault.deposit.basketAmountLabel}
                    </label>
                    {nativeBalance !== undefined && (
                      <span className="deposit-balance">
                        {t.vault.deposit.basketBalance}{" "}
                        <strong>
                          {Number(formatEther(nativeBalance.value)).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 5 },
                          )}
                        </strong>{" "}
                        ETH
                        {Number(maxBasketEth) > 0 && (
                          <button
                            type="button"
                            className="deposit-max"
                            onClick={() => setDepositAmount(maxBasketEth)}
                          >
                            {t.vault.deposit.max}
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    id="basket-amount"
                    className="deposit-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={t.vault.deposit.basketAmountPlaceholder}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>

                <div className="deposit-field">
                  <label className="deposit-label">
                    {t.vault.deposit.slippageLabel}
                  </label>
                  <div
                    className="slippage-options"
                    role="group"
                    aria-label={t.vault.deposit.slippageLabel}
                  >
                    {[50, 100, 300].map((bps) => (
                      <button
                        key={bps}
                        type="button"
                        aria-pressed={slippageBps === bps}
                        className={slippageBps === bps ? "is-active" : ""}
                        onClick={() => setSlippageBps(bps)}
                      >
                        {bps / 100}%
                      </button>
                    ))}
                  </div>
                  <p className="deposit-hint">{t.vault.deposit.slippageHint}</p>
                </div>

                {basketPlan && basketPlan.error !== "" && (
                  <p className="deposit-error">{codeToMessage(basketPlan.error)}</p>
                )}

                {basketPlan && basketPlan.error === "" && (
                  <div className="basket-preview">
                    <span className="deposit-label">
                      {t.vault.deposit.basketPreviewTitle}
                    </span>
                    {!quoting && !basketPlan.fullyQuoted && (
                      <p className="deposit-hint">
                        {t.vault.deposit.quotesUnavailable}
                      </p>
                    )}
                    <table className="basket-table">
                      <thead>
                        <tr>
                          <th>{t.vault.portfolio.colAsset}</th>
                          <th>{t.vault.deposit.colTarget}</th>
                          <th>{t.vault.deposit.colSpend}</th>
                          <th>{t.vault.deposit.colReceive}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {basketPlan.legs.map((leg) => (
                          <tr key={leg.symbol}>
                            <td>
                              <AssetIcon symbol={leg.symbol} className="w-5 h-5" />
                              {leg.symbol}
                            </td>
                            <td>{leg.bps / 100}%</td>
                            <td>
                              {Number(formatEther(leg.amountIn)).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 6 },
                              )}
                            </td>
                            <td>
                              {leg.route === "passthrough" ? (
                                <em>{t.vault.deposit.passthroughNote}</em>
                              ) : leg.route === "fallback" ? (
                                <em>
                                  {t.vault.deposit.fallbackNote(
                                    leg.fallbackSymbol ?? "USDG",
                                  )}
                                </em>
                              ) : leg.quotedOut !== null ? (
                                Number(
                                  formatUnits(leg.quotedOut, leg.decimals ?? 18),
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 4,
                                })
                              ) : (
                                <em>{t.vault.deposit.estimateUnavailable}</em>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>{t.vault.deposit.basketTotal}</td>
                          <td>100%</td>
                          <td colSpan={2}>
                            {Number(formatEther(basketPlan.totalWei)).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 6 },
                            )}{" "}
                            ETH
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="deposit-destination">
              <span className="deposit-destination-label">
                {t.vault.deposit.toVault}
              </span>
              <span className="deposit-destination-address">{vault.vaultAddress}</span>
            </div>

            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setDialog("")}
                disabled={busy}
              >
                {t.vault.deposit.cancel}
              </button>
              {depositMode === "direct" ? (
                <button
                  className="button primary"
                  onClick={handleDeposit}
                  disabled={busy || !depositAsset || !depositAmount}
                >
                  {busy ? (
                    t.vault.deposit.sending
                  ) : (
                    <>
                      <SendHorizonal size={14} /> {t.vault.deposit.send}
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={handleBasketDeposit}
                  disabled={
                    busy ||
                    quoting ||
                    !depositAmount ||
                    !routerStatus?.available ||
                    !basketPlan ||
                    basketPlan.error !== "" ||
                    !basketPlan.fullyQuoted
                  }
                >
                  {busy ? (
                    t.vault.deposit.sending
                  ) : quoting ? (
                    t.vault.deposit.routerCheckingTitle
                  ) : (
                    <>
                      <Split size={14} /> {t.vault.deposit.basketSend}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Pending Modal */}
      {dialog === "deposit_pending" && (
        <Dialog title={t.vault.deposit.pendingTitle} onClose={() => {}}>
          <div className="dialog-body">
            <div className="deposit-pending-state">
              <div className="deposit-spinner" />
              <p className="text-sm" style={{ color: "var(--ink)" }}>
                {t.vault.deposit.pendingBody}
              </p>
              {depositTxHash && (
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ marginTop: "0.75rem", fontSize: "0.78rem" }}
                >
                  <ExternalLink size={12} /> {t.vault.deposit.viewTransaction}
                </a>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Deposit Success Modal */}
      {dialog === "deposit_success" && (
        <Dialog title={t.vault.deposit.successTitle} onClose={() => setDialog("")}>
          <div className="dialog-body">
            <div className="deposit-success-state">
              <div className="success-badge" style={{ margin: "0 auto 1rem" }}>
                <Check size={22} />
              </div>
              <p className="text-sm" style={{ color: "var(--ink)", textAlign: "center", marginBottom: "0.75rem" }}>
                {t.vault.deposit.successBodyPrefix}{" "}
                <strong>{depositAsset}</strong>{" "}
                {t.vault.deposit.successBodySuffix}
              </p>
              {depositTxHash && (
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ fontSize: "0.78rem" }}
                >
                  <ExternalLink size={12} /> {t.vault.deposit.viewOnExplorer}
                </a>
              )}
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => { setDialog(""); setDepositTxHash(undefined); }}>
                {t.vault.notices.done}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
