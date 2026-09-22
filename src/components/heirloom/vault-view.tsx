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
  EyeOff,
  Shield,
  Send,
} from "lucide-react";
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance, usePublicClient } from "wagmi";
import { parseUnits, parseEther, formatUnits, formatEther, erc20Abi } from "viem";
import {
  fetchTrust,
  submitHeartbeat,
  verifyFunding,
  claimVesting,
  fetchLetter,
  fetchRelayerInfo,
  submitSealedDeposit,
  createTelegramPairing,
  unlinkTelegram,
  configureInferenceAllowance,
  fetchInferenceAllowances,
  stakeOrbio,
  unstakeOrbio,
  fetchStakeStatus,
  configureSuccessionAiBudget,
  fetchSuccessionAiBudget,
  type TrustResponse,
  type RelayerInfoResponse,
  type TelegramPairingResponse,
  type InferenceSchedule,
  type InferenceRelease,
  type StakeStatus,
  type SuccessionAiBudgetStatus,
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
import { planBasketDeposit, CREDIT_SYMBOL } from "@/lib/heirloom/basket.mjs";
import type { BasketPlan, BasketQuote } from "@/lib/heirloom/basket.mjs";
import {
  checkRouterAvailability,
  quoteBasketLegs,
  buildBasketDepositRequest,
  buildUsdgApprovalRequest,
  buildUsdgTransferRequest,
  SWAP_ROUTER_ADDRESS,
  USDG_ADDRESS,
  type RouterAvailability,
} from "@/lib/heirloom/swap-router";
import {
  PERMIT2_ADDRESS,
  buildPermit2ApprovalRequest,
  buildPermit2TypedData,
} from "@/lib/heirloom/permit2";
import { quoteCreditLeg, buildCreditLegPayload } from "@/lib/heirloom/orbio";


// Tab identity is a stable key; only the label is translated.
const TAB_KEYS = ["portfolio", "schedule", "inference", "letter"] as const;
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

  // --- Atomic basket deposit (pay once in ETH or USDG, land the whole basket) ---
  const [depositMode, setDepositMode] = useState<"direct" | "basket">("direct");
  const [basketInputAsset, setBasketInputAsset] = useState<"ETH" | "USDG">("ETH");
  const [slippageBps, setSlippageBps] = useState(100); // 1.0%, per spec
  const [routerStatus, setRouterStatus] = useState<RouterAvailability | null>(null);
  const [basketQuotes, setBasketQuotes] = useState<Record<string, BasketQuote>>({});
  const [quoting, setQuoting] = useState(false);
  const [approvingUsdg, setApprovingUsdg] = useState(false);
  const [sealedExecution, setSealedExecution] = useState(false);
  const [relayerInfo, setRelayerInfo] = useState<RelayerInfoResponse | null>(null);
  const [approvingPermit2, setApprovingPermit2] = useState(false);
  const [isRelaying, setIsRelaying] = useState(false);

  // --- AI Allowance (InferenceLeg) ---
  const [inferenceUsdgPerCycle, setInferenceUsdgPerCycle] = useState("");
  const [inferenceCadenceDays, setInferenceCadenceDays] = useState("30");
  const [inferenceTotalUsdg, setInferenceTotalUsdg] = useState("");
  const [inferenceBeneficiaryOverride, setInferenceBeneficiaryOverride] = useState("");
  const [inferenceSchedules, setInferenceSchedules] = useState<InferenceSchedule[]>([]);
  const [inferenceReleases, setInferenceReleases] = useState<InferenceRelease[]>([]);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceSubmitting, setInferenceSubmitting] = useState(false);
  const [inferenceError, setInferenceError] = useState("");
  const [inferenceNotice, setInferenceNotice] = useState("");

  // --- ORBIO Staking ---
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakeStatus, setStakeStatus] = useState<StakeStatus | null>(null);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [staking, setStaking] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [stakeError, setStakeError] = useState("");
  const [stakeNotice, setStakeNotice] = useState("");

  // --- Succession AI Budget ---
  const [successionBudget, setSuccessionBudget] = useState("");
  const [successionStatus, setSuccessionStatus] = useState<SuccessionAiBudgetStatus | null>(null);
  const [successionLoading, setSuccessionLoading] = useState(false);
  const [settingSuccessionBudget, setSettingSuccessionBudget] = useState(false);
  const [successionError, setSuccessionError] = useState("");
  const [successionNotice, setSuccessionNotice] = useState("");

  // --- Telegram Bot Integration ---
  const [telegramPairing, setTelegramPairing] = useState<TelegramPairingResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCopied, setTelegramCopied] = useState(false);
  const [openedFromTelegram, setOpenedFromTelegram] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkin") === "1") {
        setOpenedFromTelegram(true);
      }
    }
  }, []);

  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });

  const { data: nativeBalance } = useBalance({
    address,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: !!address },
  });

  const { data: usdgBalanceRaw, refetch: refetchUsdgBalance } = useReadContract({
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  const { data: usdgAllowanceRaw, refetch: refetchUsdgAllowance } = useReadContract({
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, SWAP_ROUTER_ADDRESS] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  const { data: usdgPermit2AllowanceRaw, refetch: refetchPermit2Allowance } = useReadContract({
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, PERMIT2_ADDRESS] : undefined,
    chainId: ROBINHOOD_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  const usdgBalance =
    usdgBalanceRaw !== undefined ? formatUnits(usdgBalanceRaw, 6) : "0";
  const usdgAllowance = usdgAllowanceRaw ?? 0n;
  const usdgPermit2Allowance = usdgPermit2AllowanceRaw ?? 0n;

  useEffect(() => {
    if (dialog === "deposit") {
      fetchRelayerInfo()
        .then((info) => setRelayerInfo(info))
        .catch(() => setRelayerInfo(null));
    }
  }, [dialog]);

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

  // CREDIT can only be delivered by the Sealed Relayer (it needs a signed
  // Permit2 authorization over USDG) — ETH input and the public multicall
  // path have no venue for it at all, per handleBasketDeposit's guard below.
  const requiresCredit = basketLegs.some((leg) => leg.symbol === CREDIT_SYMBOL);

  useEffect(() => {
    if (!requiresCredit) return;
    setBasketInputAsset("USDG");
    setSealedExecution(true);
  }, [requiresCredit]);

  const basketPlan = useMemo<BasketPlan | null>(() => {
    const amount = parseFloat(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) return null;
    let totalWei: bigint;
    try {
      totalWei =
        basketInputAsset === "USDG"
          ? parseUnits(depositAmount.trim(), 6)
          : parseEther(depositAmount.trim());
    } catch {
      return null;
    }
    return planBasketDeposit({
      totalWei,
      legs: basketLegs,
      quotes: basketQuotes,
      slippageBps,
      inputSymbol: basketInputAsset,
      fallbackSymbol: "USDG",
    }) as BasketPlan;
  }, [depositAmount, basketLegs, basketQuotes, slippageBps, basketInputAsset]);

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
        // CREDIT never touches a Uniswap pool, so it's quoted separately
        // against the Orbio Exchange and merged into the same quote map.
        const creditLeg = basketPlan.legs.find((leg) => leg.route === "credit");
        const [quotes, creditQuote] = await Promise.all([
          quoteBasketLegs(
            publicClient,
            basketPlan.legs
              .filter((leg) => leg.route !== "passthrough" && leg.route !== "credit" && !!leg.tokenAddress)
              .map((leg) => ({
                symbol: leg.symbol,
                tokenAddress: leg.tokenAddress as `0x${string}`,
                decimals: leg.decimals,
                amountIn: leg.amountIn,
              })),
            basketInputAsset === "USDG" ? USDG_ADDRESS : undefined,
          ),
          creditLeg ? quoteCreditLeg(publicClient, creditLeg.amountIn) : Promise.resolve(null),
        ]);
        if (creditQuote) quotes[CREDIT_SYMBOL] = creditQuote;
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
  }, [dialog, depositMode, publicClient, routerStatus, depositAmount, slippageBps, basketInputAsset]);

  // Load AI allowance schedules/releases when that tab is opened.
  useEffect(() => {
    if (tab !== "inference" || !realTrust?.trust.id) return;
    let cancelled = false;
    setInferenceLoading(true);
    fetchInferenceAllowances(realTrust.trust.id)
      .then(({ schedules, releases }) => {
        if (!cancelled) {
          setInferenceSchedules(schedules);
          setInferenceReleases(releases);
        }
      })
      .finally(() => {
        if (!cancelled) setInferenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, realTrust?.trust.id]);

  // Load ORBIO stake status (live on-chain position + history) alongside it.
  useEffect(() => {
    if (tab !== "inference" || !realTrust?.trust.id) return;
    let cancelled = false;
    setStakeLoading(true);
    fetchStakeStatus(realTrust.trust.id)
      .then((status) => {
        if (!cancelled) setStakeStatus(status);
      })
      .finally(() => {
        if (!cancelled) setStakeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, realTrust?.trust.id]);

  // Load succession AI budget config + grant history alongside it.
  useEffect(() => {
    if (tab !== "inference" || !realTrust?.trust.id) return;
    let cancelled = false;
    setSuccessionLoading(true);
    fetchSuccessionAiBudget(realTrust.trust.id)
      .then((status) => {
        if (!cancelled) setSuccessionStatus(status);
      })
      .finally(() => {
        if (!cancelled) setSuccessionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, realTrust?.trust.id]);

  const handleConfigureInference = async () => {
    if (!realTrust?.trust.id || !address) {
      setInferenceError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!inferenceUsdgPerCycle || !inferenceCadenceDays || !inferenceTotalUsdg) {
      setInferenceError(t.vault.errors.invalidAmount);
      return;
    }

    setInferenceSubmitting(true);
    setInferenceError("");
    setInferenceNotice("");
    try {
      await configureInferenceAllowance(realTrust.trust.id, {
        grantorAddress: address,
        usdgPerCycle: inferenceUsdgPerCycle,
        cadenceDays: parseInt(inferenceCadenceDays, 10),
        totalUsdg: inferenceTotalUsdg,
        beneficiaryAddress: inferenceBeneficiaryOverride || undefined,
      });

      setInferenceNotice(
        t.vault.inference.configuredNotice(
          inferenceUsdgPerCycle,
          inferenceCadenceDays,
          inferenceTotalUsdg,
        ),
      );
      setInferenceUsdgPerCycle("");
      setInferenceTotalUsdg("");
      setInferenceBeneficiaryOverride("");

      const { schedules, releases } = await fetchInferenceAllowances(realTrust.trust.id);
      setInferenceSchedules(schedules);
      setInferenceReleases(releases);
    } catch (e: any) {
      setInferenceError(e?.message || t.vault.errors.txFailed);
    } finally {
      setInferenceSubmitting(false);
    }
  };

  const handleStake = async () => {
    if (!realTrust?.trust.id || !address) {
      setStakeError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!stakeAmount) {
      setStakeError(t.vault.errors.invalidAmount);
      return;
    }

    setStaking(true);
    setStakeError("");
    setStakeNotice("");
    try {
      const result = await stakeOrbio(realTrust.trust.id, {
        grantorAddress: address,
        amountOrbio: stakeAmount,
      });
      setStakeNotice(result.message);
      setStakeAmount("");
      const status = await fetchStakeStatus(realTrust.trust.id);
      setStakeStatus(status);
    } catch (e: any) {
      setStakeError(e?.message || t.vault.errors.txFailed);
    } finally {
      setStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!realTrust?.trust.id || !address) {
      setStakeError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!unstakeAmount) {
      setStakeError(t.vault.errors.invalidAmount);
      return;
    }

    setUnstaking(true);
    setStakeError("");
    setStakeNotice("");
    try {
      const result = await unstakeOrbio(realTrust.trust.id, {
        grantorAddress: address,
        amountOrbio: unstakeAmount,
      });
      setStakeNotice(result.message);
      setUnstakeAmount("");
      const status = await fetchStakeStatus(realTrust.trust.id);
      setStakeStatus(status);
    } catch (e: any) {
      setStakeError(e?.message || t.vault.errors.txFailed);
    } finally {
      setUnstaking(false);
    }
  };

  const handleConfigureSuccessionBudget = async () => {
    if (!realTrust?.trust.id || !address) {
      setSuccessionError(t.vault.errors.connectToDeposit);
      return;
    }
    if (!successionBudget) {
      setSuccessionError(t.vault.errors.invalidAmount);
      return;
    }

    setSettingSuccessionBudget(true);
    setSuccessionError("");
    setSuccessionNotice("");
    try {
      await configureSuccessionAiBudget(realTrust.trust.id, {
        grantorAddress: address,
        budgetUsdg: successionBudget,
      });
      setSuccessionNotice(t.vault.inference.successionConfiguredNotice(successionBudget));
      setSuccessionBudget("");
      const status = await fetchSuccessionAiBudget(realTrust.trust.id);
      setSuccessionStatus(status);
    } catch (e: any) {
      setSuccessionError(e?.message || t.vault.errors.txFailed);
    } finally {
      setSettingSuccessionBudget(false);
    }
  };

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

  // Approve USDG for SwapRouter02
  const handleApproveUsdg = async () => {
    if (!basketPlan || !address) return;
    setApprovingUsdg(true);
    setError("");
    try {
      const approveReq = buildUsdgApprovalRequest({
        amount: basketPlan.routedWei,
        spender: SWAP_ROUTER_ADDRESS,
      });
      const hash = await writeContractAsync({
        ...approveReq,
        chainId: ROBINHOOD_CHAIN_ID,
      });
      setNotice(t.vault.deposit.approvalSubmitted);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchUsdgAllowance();
      setNotice(t.vault.deposit.approvalSuccess);
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || t.vault.errors.txFailed;
      setError(msg);
    } finally {
      setApprovingUsdg(false);
    }
  };

  // Approve USDG for Permit2
  const handleApprovePermit2 = async () => {
    if (!address) return;
    setApprovingPermit2(true);
    setError("");
    try {
      const approveReq = buildPermit2ApprovalRequest();
      const hash = await writeContractAsync({
        ...approveReq,
        chainId: ROBINHOOD_CHAIN_ID,
      });
      setNotice(t.vault.deposit.permit2ApprovalSubmitted);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchPermit2Allowance();
      setNotice(t.vault.deposit.permit2ApprovalSuccess);
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || t.vault.errors.txFailed;
      setError(msg);
    } finally {
      setApprovingPermit2(false);
    }
  };

  // Sealed Basket Deposit Handler — off-chain Permit2 signature + Heirloom Relayer execution
  const handleSealedBasketDeposit = async () => {
    if (!realTrust || !vault?.vaultAddress || !address) {
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
    if (!basketPlan.fullyQuoted) {
      setError(t.vault.errors.quotesRequired);
      return;
    }
    if (usdgBalanceRaw !== undefined && usdgBalanceRaw < basketPlan.totalWei) {
      setError(t.vault.errors.insufficientUsdg(formatUnits(usdgBalanceRaw, 6)));
      return;
    }
    if (usdgPermit2Allowance < basketPlan.totalWei) {
      setError(t.vault.deposit.approvePermit2);
      return;
    }
    if (!relayerInfo?.relayerAddress || !relayerInfo.isLive) {
      setError(t.vault.deposit.relayerUnavailable);
      return;
    }

    setIsRelaying(true);
    setError("");
    try {
      const typed = buildPermit2TypedData({
        amount: basketPlan.totalWei,
        spender: relayerInfo.relayerAddress,
        token: USDG_ADDRESS,
      });

      const signature = await signTypedDataAsync({
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message,
      });

      setNotice(t.vault.deposit.relayingSealedDeposit);

      const result = await submitSealedDeposit(realTrust.trust.id, {
        permit: {
          permitted: {
            token: USDG_ADDRESS,
            amount: basketPlan.totalWei.toString(),
          },
          nonce: typed.nonce.toString(),
          deadline: typed.deadline.toString(),
        },
        signature,
        owner: address,
        legs: [
          ...basketPlan.swaps.map((s) => ({
            symbol: s.symbol,
            tokenAddress: s.tokenAddress ?? "",
            amountIn: s.amountIn.toString(),
            minOut: (s.minOut ?? 0n).toString(),
            fee: s.routing?.fee ?? 3000,
          })),
          ...basketPlan.creditLegs.map(buildCreditLegPayload),
        ],
        passthroughWei: basketPlan.passthroughWei.toString(),
      });

      setDepositTxHash(result.txHashes.swapTxHash || result.txHashes.pullTxHash);
      setDialog("deposit_success");
      setDepositAmount("");
      refetchUsdgBalance();
      refetchPermit2Allowance();
      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || t.vault.errors.txFailed;
      setError(msg);
    } finally {
      setIsRelaying(false);
    }
  };

  // Atomic Basket Deposit Handler — native ETH or USDG in, whole basket out
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
    // CREDIT is bought through the Orbio Exchange, not a Uniswap pool — the
    // direct multicall path has nowhere to route it and would silently
    // under-fund this slice of the basket. Only the Sealed Relayer can deliver it.
    if (basketPlan.creditLegs.length > 0) {
      setError(t.vault.errors.creditRequiresSealed);
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

    if (basketInputAsset === "USDG") {
      if (usdgBalanceRaw !== undefined && usdgBalanceRaw < basketPlan.totalWei) {
        setError(t.vault.errors.insufficientUsdg(formatUnits(usdgBalanceRaw, 6)));
        return;
      }
      if (basketPlan.routedWei > 0n && usdgAllowance < basketPlan.routedWei) {
        setError(t.vault.deposit.approveUsdg);
        return;
      }
    } else {
      if (
        nativeBalance !== undefined &&
        nativeBalance.value < basketPlan.totalWei + GAS_RESERVE_WEI
      ) {
        setError(t.vault.errors.insufficientEth(formatEther(nativeBalance.value)));
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      let lastTxHash: `0x${string}` | undefined;

      if (basketPlan.inputSymbol === "USDG") {
        if (basketPlan.swaps.length > 0) {
          const request = buildBasketDepositRequest({
            plan: basketPlan,
            recipient: vault.vaultAddress as `0x${string}`,
          });

          lastTxHash = await writeContractAsync({
            ...request,
            chainId: ROBINHOOD_CHAIN_ID,
          });
        }

        if (basketPlan.passthroughWei > 0n) {
          const transferReq = buildUsdgTransferRequest({
            to: vault.vaultAddress as `0x${string}`,
            amount: basketPlan.passthroughWei,
          });

          lastTxHash = await writeContractAsync({
            ...transferReq,
            chainId: ROBINHOOD_CHAIN_ID,
          });
        }
      } else {
        // No refund recipient: SwapRouter02's refundETH always pays msg.sender,
        // which is the grantor signing this transaction.
        const request = buildBasketDepositRequest({
          plan: basketPlan,
          recipient: vault.vaultAddress as `0x${string}`,
        });

        lastTxHash = await writeContractAsync({
          ...request,
          chainId: ROBINHOOD_CHAIN_ID,
        });
      }

      if (lastTxHash) {
        setDepositTxHash(lastTxHash);
        setDialog("deposit_pending");
      }
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
      refetchUsdgBalance();
      refetchUsdgAllowance();
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

  // Connect Telegram alerts via @HeirloomRHBot
  const handleConnectTelegram = async () => {
    if (!realTrust) return;
    setPairingLoading(true);
    setError("");
    try {
      const res = await createTelegramPairing(realTrust.trust.id, address);
      setTelegramPairing(res);
      setShowTelegramModal(true);
    } catch (e: any) {
      setError(e?.message || "Failed to generate Telegram pairing link");
    } finally {
      setPairingLoading(false);
    }
  };

  // Disconnect Telegram alerts
  const handleUnlinkTelegram = async () => {
    if (!realTrust) return;
    setUnlinkingTelegram(true);
    setError("");
    try {
      await unlinkTelegram(realTrust.trust.id);
      setNotice(t.vault.telegram.disconnectButton);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to disconnect Telegram");
    } finally {
      setUnlinkingTelegram(false);
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

  const gracePeriodDeadline = realTrust?.trust.gracePeriodDeadline
    ? new Date(realTrust.trust.gracePeriodDeadline)
    : null;

  let graceDaysRemaining = 0;
  if (gracePeriodDeadline) {
    const diffMs = gracePeriodDeadline.getTime() - Date.now();
    graceDaysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
  }

  const isInGracePeriod =
    realTrust?.trust.status === "in_grace_period" ||
    Boolean(
      vault.heartbeatDeadline &&
        new Date() > new Date(vault.heartbeatDeadline) &&
        gracePeriodDeadline &&
        new Date() <= gracePeriodDeadline
    );

  const isSuccessionTriggered =
    realTrust?.trust.status === "succession_triggered" ||
    Boolean(gracePeriodDeadline && new Date() > gracePeriodDeadline) ||
    Boolean(!isInGracePeriod && vault.heartbeatDeadline && new Date() > new Date(vault.heartbeatDeadline) && !gracePeriodDeadline);

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
                  : isInGracePeriod
                    ? "bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse"
                    : vault.corpusFunded
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                      : "bg-amber-950/80 text-amber-300 border-amber-800"
              }`}
            >
              {isSuccessionTriggered
                ? t.vault.status.successionTriggered
                : isInGracePeriod
                  ? t.vault.status.inGracePeriod
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

      {openedFromTelegram && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start justify-between gap-3 text-sm text-emerald-300">
          <div className="flex items-start gap-2.5">
            <Heart size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-emerald-200 font-semibold mb-0.5">
                {t.vault.telegram.checkinBannerTitle}
              </strong>
              <span className="text-xs text-emerald-300/90">
                {t.vault.telegram.checkinBannerDesc}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="text-emerald-400 hover:text-emerald-200 text-xs px-1.5 py-0.5"
            onClick={() => setOpenedFromTelegram(false)}
          >
            ✕
          </button>
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
                    const canClaim = (isPassed || isSuccessionTriggered) && isBeneficiary && !isClaimed && !isInGracePeriod;
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

            {tab === "inference" && (
              <>
                <div className="spread panel-title">
                  <h2>{t.vault.inference.title}</h2>
                  <span className="micro">{t.vault.inference.micro}</span>
                </div>
                <p className="field-hint" style={{ marginTop: "-6px", marginBottom: "16px" }}>
                  {t.vault.inference.hint}
                </p>

                {isGrantor && !isSuccessionTriggered && (
                  <div className="deposit-field" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "6px" }}>{t.vault.inference.stakeTitle}</h3>
                    <p className="field-hint" style={{ marginBottom: "10px" }}>
                      {t.vault.inference.stakeHint}
                    </p>

                    {stakeStatus && (
                      <p className="field-hint" style={{ marginBottom: "10px" }}>
                        {t.vault.inference.stakedLabel}:{" "}
                        <b>{formatUnits(BigInt(stakeStatus.stakedAtomic), 18)} ORBIO</b>
                        {" · "}
                        {t.vault.inference.minPositionNote(
                          formatUnits(BigInt(stakeStatus.minPositionAtomic), 18),
                        )}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label className="deposit-label">
                          {t.vault.inference.stakeAmountLabel}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={t.vault.inference.stakeAmountPlaceholder}
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                        />
                        <button
                          className="button primary"
                          style={{ marginTop: "8px", width: "100%" }}
                          onClick={handleStake}
                          disabled={staking}
                        >
                          {staking ? t.vault.inference.staking : t.vault.inference.stakeSubmit}
                        </button>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="deposit-label">
                          {t.vault.inference.unstakeAmountLabel}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={t.vault.inference.stakeAmountPlaceholder}
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                        />
                        <button
                          className="button"
                          style={{ marginTop: "8px", width: "100%" }}
                          onClick={handleUnstake}
                          disabled={unstaking}
                        >
                          {unstaking
                            ? t.vault.inference.unstaking
                            : t.vault.inference.unstakeSubmit}
                        </button>
                      </div>
                    </div>

                    {stakeError && (
                      <p className="field-hint" style={{ color: "var(--error, #c0524a)" }}>
                        {stakeError}
                      </p>
                    )}
                    {stakeNotice && (
                      <p className="field-hint" style={{ color: "var(--success, #4a8f5c)" }}>
                        {stakeNotice}
                      </p>
                    )}

                    {!stakeLoading && stakeStatus && stakeStatus.events.length > 0 && (
                      <table className="holdings-table" style={{ marginTop: "10px" }}>
                        <tbody>
                          {stakeStatus.events.slice(0, 5).map((ev) => (
                            <tr key={ev.id}>
                              <td>
                                {ev.kind === "stake"
                                  ? t.vault.inference.stakeEventStake
                                  : ev.kind === "unstake"
                                    ? t.vault.inference.stakeEventUnstake
                                    : t.vault.inference.stakeEventClaim}
                              </td>
                              <td>
                                {formatUnits(BigInt(ev.amount_atomic || "0"), ev.kind === "claim" ? 6 : 18)}{" "}
                                {ev.kind === "claim" ? "CREDIT" : "ORBIO"}
                              </td>
                              <td>
                                {ev.tx_hash && (
                                  <a
                                    href={`${ROBINHOOD_EXPLORER_URL}/tx/${ev.tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {t.vault.inference.viewTx}
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {isGrantor && !isSuccessionTriggered && (
                  <div className="deposit-field" style={{ marginBottom: "24px" }}>
                    <h3 style={{ marginBottom: "10px" }}>{t.vault.inference.formTitle}</h3>

                    <label className="deposit-label">{t.vault.inference.usdgPerCycleLabel}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={t.vault.inference.usdgPerCyclePlaceholder}
                      value={inferenceUsdgPerCycle}
                      onChange={(e) => setInferenceUsdgPerCycle(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    />

                    <label className="deposit-label">{t.vault.inference.cadenceDaysLabel}</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder={t.vault.inference.cadenceDaysPlaceholder}
                      value={inferenceCadenceDays}
                      onChange={(e) => setInferenceCadenceDays(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    />

                    <label className="deposit-label">{t.vault.inference.totalUsdgLabel}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={t.vault.inference.totalUsdgPlaceholder}
                      value={inferenceTotalUsdg}
                      onChange={(e) => setInferenceTotalUsdg(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    />

                    <label className="deposit-label">
                      {t.vault.inference.beneficiaryOverrideLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={t.vault.inference.beneficiaryOverridePlaceholder}
                      value={inferenceBeneficiaryOverride}
                      onChange={(e) => setInferenceBeneficiaryOverride(e.target.value)}
                      style={{ marginBottom: "14px" }}
                    />

                    {inferenceError && (
                      <p className="field-hint" style={{ color: "var(--error, #c0524a)" }}>
                        {inferenceError}
                      </p>
                    )}
                    {inferenceNotice && (
                      <p className="field-hint" style={{ color: "var(--success, #4a8f5c)" }}>
                        {inferenceNotice}
                      </p>
                    )}

                    <button
                      className="button primary"
                      onClick={handleConfigureInference}
                      disabled={inferenceSubmitting}
                    >
                      {inferenceSubmitting
                        ? t.vault.inference.submitting
                        : t.vault.inference.submit}
                    </button>
                  </div>
                )}

                <h3 style={{ marginBottom: "10px" }}>{t.vault.inference.schedulesTitle}</h3>
                {inferenceLoading ? (
                  <p className="field-hint">{t.vault.loading}</p>
                ) : inferenceSchedules.length === 0 ? (
                  <div className="letter-empty">
                    <Heart size={25} />
                    <h3>{t.vault.inference.emptyTitle}</h3>
                    <p>{t.vault.inference.emptyBody}</p>
                  </div>
                ) : (
                  <table className="holdings-table" style={{ marginBottom: "24px" }}>
                    <thead>
                      <tr>
                        <th>{t.vault.inference.colBeneficiary}</th>
                        <th>{t.vault.inference.colPerCycle}</th>
                        <th>{t.vault.inference.colRemaining}</th>
                        <th>{t.vault.inference.colNextRelease}</th>
                        <th>{t.vault.inference.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inferenceSchedules.map((s) => (
                        <tr key={s.id}>
                          <td className="font-mono">
                            {s.beneficiary_address.slice(0, 6)}...{s.beneficiary_address.slice(-4)}
                          </td>
                          <td>{formatUnits(BigInt(s.usdg_per_cycle_atomic), 6)} USDG</td>
                          <td>{formatUnits(BigInt(s.total_remaining_atomic), 6)} USDG</td>
                          <td>
                            {new Date(s.next_release_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            {s.active
                              ? t.vault.inference.statusActive
                              : t.vault.inference.statusExhausted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {inferenceReleases.length > 0 && (
                  <>
                    <h3 style={{ marginBottom: "10px" }}>{t.vault.inference.releasesTitle}</h3>
                    <table className="holdings-table">
                      <thead>
                        <tr>
                          <th>{t.vault.inference.colPerCycle}</th>
                          <th>{t.vault.inference.colStatus}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inferenceReleases.map((r) => {
                          const statusLabel =
                            r.status === "confirmed"
                              ? t.vault.inference.releaseConfirmed
                              : r.status === "deferred_thin_book"
                                ? t.vault.inference.releaseDeferredThinBook
                                : r.status === "deferred_insufficient_funds"
                                  ? t.vault.inference.releaseDeferredFunds
                                  : t.vault.inference.releaseFailed;
                          return (
                            <tr key={r.id}>
                              <td>{formatUnits(BigInt(r.usdg_spent_atomic || "0"), 6)} USDG</td>
                              <td>{statusLabel}</td>
                              <td>
                                {r.tx_hash && (
                                  <a
                                    href={`${ROBINHOOD_EXPLORER_URL}/tx/${r.tx_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {t.vault.inference.viewTx}
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}

                {isGrantor && (
                  <div className="deposit-field" style={{ marginTop: "24px" }}>
                    <h3 style={{ marginBottom: "6px" }}>{t.vault.inference.successionTitle}</h3>
                    <p className="field-hint" style={{ marginBottom: "10px" }}>
                      {t.vault.inference.successionHint}
                    </p>

                    {!successionLoading && successionStatus?.grantedAt ? (
                      <p className="field-hint">
                        {t.vault.inference.successionAlreadyGranted(
                          new Date(successionStatus.grantedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }),
                        )}
                      </p>
                    ) : !successionLoading &&
                      successionStatus &&
                      !successionStatus.budgetUsdgAtomic ? (
                      <>
                        <label className="deposit-label">
                          {t.vault.inference.successionBudgetLabel}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={t.vault.inference.successionBudgetPlaceholder}
                          value={successionBudget}
                          onChange={(e) => setSuccessionBudget(e.target.value)}
                          style={{ marginBottom: "10px" }}
                        />
                        <button
                          className="button primary"
                          onClick={handleConfigureSuccessionBudget}
                          disabled={settingSuccessionBudget}
                        >
                          {settingSuccessionBudget
                            ? t.vault.inference.settingBudget
                            : t.vault.inference.successionSubmit}
                        </button>
                      </>
                    ) : !successionLoading && successionStatus?.budgetUsdgAtomic ? (
                      <p className="field-hint">
                        {t.vault.inference.successionConfiguredNotice(
                          formatUnits(BigInt(successionStatus.budgetUsdgAtomic), 6),
                        )}
                      </p>
                    ) : null}

                    {successionError && (
                      <p className="field-hint" style={{ color: "var(--error, #c0524a)" }}>
                        {successionError}
                      </p>
                    )}
                    {successionNotice && (
                      <p className="field-hint" style={{ color: "var(--success, #4a8f5c)" }}>
                        {successionNotice}
                      </p>
                    )}
                  </div>
                )}
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

            {isInGracePeriod ? (
              <>
                <strong className="text-amber-400">
                  {graceDaysRemaining} <span>{t.vault.heartbeat.daysRemaining}</span>
                </strong>
                <p className="text-xs text-amber-400 font-medium leading-relaxed">
                  {t.vault.heartbeat.gracePeriod(graceDaysRemaining)}
                </p>
              </>
            ) : isSuccessionTriggered ? (
              <>
                <strong>
                  0 <span>{t.vault.heartbeat.daysRemaining}</span>
                </strong>
                <p className="text-xs text-rose-400 font-medium">
                  {t.vault.heartbeat.missed}
                </p>
              </>
            ) : (
              <>
                <strong>
                  {daysRemaining} <span>{t.vault.heartbeat.daysRemaining}</span>
                </strong>
                <p className="text-xs text-[#8d7c68]">
                  {t.vault.heartbeat.window(vault.heartbeat)}
                </p>
              </>
            )}

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

            {/* Telegram Bot Alerts Integration */}
            {isGrantor && !isSuccessionTriggered && (
              <div className="mt-3 pt-3 border-t border-[#332b24]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-[#e8e0d4] flex items-center gap-1.5">
                    <Send size={12} className="text-[#2AABEE]" />
                    {t.vault.telegram.title}
                  </span>
                  {realTrust?.trust.telegramLinked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8d7c68] leading-tight mb-2">
                  {t.vault.telegram.desc}
                </p>
                {realTrust?.trust.telegramLinked ? (
                  <button
                    type="button"
                    className="button secondary text-xs w-full py-1.5 justify-center"
                    onClick={handleUnlinkTelegram}
                    disabled={unlinkingTelegram}
                  >
                    {unlinkingTelegram
                      ? t.vault.telegram.disconnecting
                      : t.vault.telegram.disconnectButton}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button secondary text-xs w-full py-1.5 justify-center text-[#2AABEE] border-[#2AABEE]/40 hover:border-[#2AABEE]"
                    onClick={handleConnectTelegram}
                    disabled={pairingLoading}
                  >
                    <Send size={12} />
                    {pairingLoading
                      ? t.vault.telegram.connecting
                      : t.vault.telegram.connectButton}
                  </button>
                )}
              </div>
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

      {/* Telegram Pairing Modal */}
      {showTelegramModal && telegramPairing && (
        <Dialog
          title={t.vault.telegram.modalTitle}
          onClose={() => setShowTelegramModal(false)}
        >
          <div className="dialog-body space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              {t.vault.telegram.modalDesc}
            </p>

            <div className="p-3 rounded-lg border border-[#332b24] bg-[#1a1613] space-y-1">
              <span className="text-[11px] text-[#8d7c68] block">Telegram Bot</span>
              <strong className="text-sm text-[#2AABEE] block font-mono">
                @{telegramPairing.botUsername}
              </strong>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={telegramPairing.startLink}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary w-full justify-center gap-2"
                style={{ backgroundColor: "#2AABEE", borderColor: "#2AABEE", color: "#fff" }}
              >
                <Send size={14} />
                {t.vault.telegram.openBot}
              </a>

              <button
                type="button"
                className="button secondary w-full justify-center text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(telegramPairing.startLink);
                  setTelegramCopied(true);
                  setTimeout(() => setTelegramCopied(false), 2000);
                }}
              >
                {telegramCopied ? t.vault.telegram.copied : t.vault.telegram.copyLink}
              </button>
            </div>
          </div>
        </Dialog>
      )}

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
                  {basketInputAsset === "USDG"
                    ? t.vault.deposit.basketIntroUsdg
                    : t.vault.deposit.basketIntro}
                </p>

                <div className="deposit-field">
                  <label className="deposit-label">
                    {t.vault.deposit.inputAssetLabel}
                  </label>
                  <div
                    className="deposit-currency-options"
                    role="group"
                    aria-label={t.vault.deposit.inputAssetLabel}
                  >
                    <button
                      type="button"
                      aria-pressed={basketInputAsset === "ETH"}
                      className={basketInputAsset === "ETH" ? "is-active" : ""}
                      disabled={requiresCredit}
                      title={requiresCredit ? t.vault.errors.creditRequiresSealed : undefined}
                      onClick={() => {
                        setBasketInputAsset("ETH");
                        setDepositAmount("");
                      }}
                    >
                      <AssetIcon symbol="ETH" className="w-4 h-4" />
                      {t.vault.deposit.inputAssetEth}
                    </button>
                    <button
                      type="button"
                      aria-pressed={basketInputAsset === "USDG"}
                      className={basketInputAsset === "USDG" ? "is-active" : ""}
                      onClick={() => {
                        setBasketInputAsset("USDG");
                        setDepositAmount("");
                      }}
                    >
                      <AssetIcon symbol="USDG" className="w-4 h-4" />
                      {t.vault.deposit.inputAssetUsdg}
                    </button>
                  </div>
                </div>

                {basketInputAsset === "USDG" && (
                  <div className="deposit-field">
                    <label className="deposit-label">
                      {t.vault.deposit.sealedExecutionLabel}
                    </label>
                    {requiresCredit ? (
                      <p className="deposit-hint">{t.vault.deposit.sealedExecutionCreditForced}</p>
                    ) : (
                      <div
                        className="deposit-currency-options"
                        role="group"
                        aria-label={t.vault.deposit.sealedExecutionLabel}
                      >
                        <button
                          type="button"
                          aria-pressed={!sealedExecution}
                          className={!sealedExecution ? "is-active" : ""}
                          onClick={() => setSealedExecution(false)}
                        >
                          <Split size={13} />
                          {t.vault.deposit.sealedExecutionPublic}
                        </button>
                        <button
                          type="button"
                          aria-pressed={sealedExecution}
                          className={sealedExecution ? "is-active" : ""}
                          onClick={() => setSealedExecution(true)}
                        >
                          <EyeOff size={13} />
                          {t.vault.deposit.sealedExecutionDarkpool}
                        </button>
                      </div>
                    )}
                    {sealedExecution && (
                      <p className="deposit-hint" style={{ marginTop: "6px" }}>
                        {t.vault.deposit.sealedExecutionDarkpoolHint}
                      </p>
                    )}
                  </div>
                )}

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
                    {basketInputAsset === "USDG" ? (
                      usdgBalanceRaw !== undefined && (
                        <span className="deposit-balance">
                          {t.vault.deposit.basketBalance}{" "}
                          <strong>
                            {Number(usdgBalance).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </strong>{" "}
                          USDG
                          {Number(usdgBalance) > 0 && (
                            <button
                              type="button"
                              className="deposit-max"
                              onClick={() => setDepositAmount(usdgBalance)}
                            >
                              {t.vault.deposit.max}
                            </button>
                          )}
                        </span>
                      )
                    ) : (
                      nativeBalance !== undefined && (
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
                      )
                    )}
                  </div>
                  <input
                    id="basket-amount"
                    className="deposit-input"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={
                      basketInputAsset === "USDG"
                        ? "e.g. 500"
                        : t.vault.deposit.basketAmountPlaceholder
                    }
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
                              {basketInputAsset === "USDG"
                                ? `${Number(formatUnits(leg.amountIn, 6)).toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 2 },
                                  )} USDG`
                                : `${Number(formatEther(leg.amountIn)).toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 6 },
                                  )} ETH`}
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
                              ) : leg.route === "credit" ? (
                                leg.quotedOut !== null ? (
                                  <>
                                    {Number(
                                      formatUnits(leg.quotedOut, leg.decimals ?? 6),
                                    ).toLocaleString(undefined, {
                                      maximumFractionDigits: 4,
                                    })}
                                    <br />
                                    <em>{t.vault.deposit.creditNote}</em>
                                  </>
                                ) : (
                                  <em>{t.vault.deposit.estimateUnavailable}</em>
                                )
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
                            {basketInputAsset === "USDG"
                              ? `${Number(formatUnits(basketPlan.totalWei, 6)).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 2 },
                                )} USDG`
                              : `${Number(formatEther(basketPlan.totalWei)).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 6 },
                                )} ETH`}
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
              ) : basketInputAsset === "USDG" && sealedExecution ? (
                usdgPermit2Allowance < (basketPlan?.totalWei ?? 0n) ? (
                  <button
                    className="button primary"
                    onClick={handleApprovePermit2}
                    disabled={
                      busy ||
                      approvingPermit2 ||
                      quoting ||
                      !depositAmount ||
                      !basketPlan ||
                      basketPlan.error !== "" ||
                      !basketPlan.fullyQuoted
                    }
                  >
                    {approvingPermit2 ? (
                      t.vault.deposit.approvingPermit2
                    ) : (
                      <>
                        <Check size={14} /> {t.vault.deposit.approvePermit2}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={handleSealedBasketDeposit}
                    disabled={
                      busy ||
                      isRelaying ||
                      quoting ||
                      !depositAmount ||
                      !basketPlan ||
                      basketPlan.error !== "" ||
                      !basketPlan.fullyQuoted
                    }
                  >
                    {isRelaying ? (
                      t.vault.deposit.relayingSealedDeposit
                    ) : (
                      <>
                        <Shield size={14} /> {t.vault.deposit.signSealedDeposit}
                      </>
                    )}
                  </button>
                )
              ) : basketInputAsset === "USDG" &&
                basketPlan !== null &&
                basketPlan.error === "" &&
                basketPlan.routedWei > 0n &&
                usdgAllowance < basketPlan.routedWei ? (
                <button
                  className="button primary"
                  onClick={handleApproveUsdg}
                  disabled={
                    busy ||
                    approvingUsdg ||
                    quoting ||
                    !depositAmount ||
                    !routerStatus?.available ||
                    !basketPlan ||
                    basketPlan.error !== "" ||
                    !basketPlan.fullyQuoted
                  }
                >
                  {approvingUsdg ? (
                    t.vault.deposit.approvingUsdg
                  ) : (
                    <>
                      <Check size={14} /> {t.vault.deposit.approveUsdg}
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={handleBasketDeposit}
                  disabled={
                    busy ||
                    approvingUsdg ||
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
                <strong>{depositMode === "basket" ? basketInputAsset : depositAsset}</strong>{" "}
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
