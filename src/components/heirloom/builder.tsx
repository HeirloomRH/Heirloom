import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Check,
  LockKeyhole,
  Heart,
  ShieldCheck,
  Sprout,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { createTrust } from "@/lib/api";
import { ConnectButton } from "../wallet/ConnectButton";
import { Dialog } from "./product";
import { AssetIcon } from "./asset-icon";
import {
  assets,
  saveVault,
  money,
  dateLabel,
  type Allocation,
  type Release,
  type Vault,
} from "@/lib/heirloom/vault";
import {
  validateAllocations,
  validateSchedule,
  validAddress,
} from "@/lib/heirloom/validation.mjs";

const titles = [
  "The foundation.",
  "Someone worth building for.",
  "Your wishes, written in.",
  "More than a portfolio.",
  "A promise, made clear.",
];
const descriptions = [
  "Give their tomorrow a place to begin.",
  "Put a person at the heart of your plan.",
  "Choose when and how the future unfolds.",
  "Tell them why you started.",
  "Read the plan carefully before saving your trust.",
];

export function Builder() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [customGrantor, setCustomGrantor] = useState("");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(10000);
  const [allocations, setAllocations] = useState<Allocation[]>([
    { ...assets[0], weight: 40 },
    { ...assets[1], weight: 35 },
    { ...assets[2], weight: 25 },
  ]);
  const [beneficiary, setBeneficiary] = useState("");
  const [wallet, setWallet] = useState("");
  const [schedule, setSchedule] = useState<Release[]>([
    { date: "2036-06-18", percent: 25 },
    { date: "2039-06-18", percent: 25 },
    { date: "2043-06-18", percent: 50 },
  ]);
  const [mode, setMode] = useState<"revocable" | "irrevocable">("revocable");
  const [heartbeat, setHeartbeat] = useState(180);
  const [guardian, setGuardian] = useState("");
  const [letter, setLetter] = useState("");
  const [ack, setAck] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string; vaultAddress: string } | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    document.getElementById("builder-heading")?.focus();
  }, [step]);

  useEffect(() => {
    if (!successData) return;

    if (countdown <= 0) {
      navigate({ to: "/vault", search: { id: successData.id } });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [successData, countdown, navigate]);

  const goToVault = () => {
    if (successData) {
      navigate({ to: "/vault", search: { id: successData.id } });
    }
  };

  const total = allocations.reduce((s, a) => s + a.weight, 0);

  const validate = (n: number) => {
    if (n === 0) {
      if (!name.trim()) return "Give your trust a name.";
      return validateAllocations(amount, allocations);
    }
    if (n === 1) {
      if (!beneficiary.trim()) return "Enter the beneficiary's name.";
      if (!validAddress(wallet.trim()))
        return "Enter a valid wallet address for the beneficiary (0x followed by 40 hex characters).";
    }
    if (n === 2) {
      const e = validateSchedule(schedule);
      if (e) return e;
      if (guardian && !validAddress(guardian.trim()))
        return "Enter a valid guardian wallet, or leave it blank.";
      if (guardian && guardian.toLowerCase() === wallet.toLowerCase())
        return "Use a different wallet for the guardian and beneficiary.";
    }
    return "";
  };

  const next = () => {
    const err = validate(step);
    if (err) {
      setError(err);
    } else {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const save = async () => {
    for (let n = 0; n < 3; n++) {
      const err = validate(n);
      if (err) {
        setStep(n);
        setError(err);
        return;
      }
    }
    const grantorAddr = address || customGrantor.trim();
    if (!grantorAddr || !validAddress(grantorAddr)) {
      setError("Please connect your wallet or enter a valid grantor wallet address.");
      return;
    }
    if (!ack) {
      setError("Please acknowledge the trust terms before sealing.");
      return;
    }
    if (mode === "irrevocable" && typed !== "IRREVOCABLE") {
      setError("Type IRREVOCABLE to confirm you understand the permanent terms.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const res = await createTrust({
        name: name.trim(),
        grantorAddress: grantorAddr,
        beneficiaryAddress: wallet.trim(),
        isRevocable: mode === "revocable",
        heartbeatWindowSeconds: (heartbeat || 30) * 86400,
        letterToBeneficiary: letter.trim() || undefined,
        guardians: guardian.trim() ? [{ address: guardian.trim(), role: "guardian" }] : [],
        assets: allocations.map((a) => ({
          symbol: a.symbol,
          targetAllocationBps: a.weight * 100,
          dripEnabled: false,
        })),
        vestingSchedules: schedule.map((s) => ({
          unlockTimestamp: new Date(s.date).toISOString(),
          percentageBps: s.percent * 100,
        })),
      });

      const v: Vault = {
        id: res.trust.id,
        name: res.trust.name,
        beneficiary: beneficiary.trim(),
        wallet: wallet.trim(),
        amount,
        allocations,
        schedule,
        mode,
        heartbeat,
        guardian: guardian.trim(),
        letter,
        createdAt: res.trust.createdAt,
        lastCheckIn: res.trust.createdAt,
        paused: false,
        demo: false,
        vaultAddress: res.trust.vaultAddress,
        vaultIndex: res.trust.vaultIndex,
        grantorAddress: grantorAddr,
      };
      saveVault(v);

      setSuccessData({
        id: res.trust.id,
        name: res.trust.name,
        vaultAddress: res.trust.vaultAddress,
      });
      setCountdown(3);
      setBusy(false);
    } catch (err: any) {
      setError(err.message || "Failed to create trust on Robinhood Chain. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <div className="product-breadcrumb">
        <Link to="/app">
          <ArrowLeft size={13} /> Your workspace
        </Link>
        <span>CREATE A TRUST</span>
      </div>
      <div className="builder-layout">
        <div>
          <div className="wizard-steps" aria-label="Creation progress">
            {["Portfolio", "Beneficiary", "Terms", "Letter", "Review"].map(
              (x, i) => (
                <button
                  key={x}
                  disabled={i > step}
                  className={
                    i === step ? "current" : i < step ? "complete" : ""
                  }
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => {
                    setStep(i);
                    setError("");
                  }}
                >
                  <span>{i < step ? <Check size={12} /> : i + 1}</span>
                  {x}
                </button>
              ),
            )}
          </div>
          <p className="eyebrow">
            STEP {String(step + 1).padStart(2, "0")} / 05
          </p>
          <h1 className="product-title" id="builder-heading" tabIndex={-1}>
            {titles[step]}
          </h1>
          <p className="product-description">{descriptions[step]}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              step === 4 ? save() : next();
            }}
            noValidate
          >
            {step === 0 && (
              <div className="form-section">
                <label>
                  Trust name
                  <input
                    autoComplete="off"
                    maxLength={70}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Emma's tomorrow"
                  />
                </label>
                <label>
                  Starting portfolio value{" "}
                  <span className="field-hint">Illustrative USD amount</span>
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      aria-label="Starting portfolio value"
                      type="number"
                      min="1"
                      max="100000000"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                    <span>USD</span>
                  </div>
                </label>
                <div className="field-heading">
                  <span>Build your basket</span>
                  <span
                    className={total === 100 ? "text-green" : "text-orange"}
                  >
                    {total}% / 100%
                  </span>
                </div>
                <p className="field-hint">
                  Select token allocations for your trust portfolio.
                </p>
                <div className="asset-select">
                  {assets.map((a) => {
                    const selected = allocations.find(
                      (x) => x.symbol === a.symbol,
                    );
                    return (
                      <div
                        key={a.symbol}
                        className={
                          selected ? "asset-option chosen" : "asset-option"
                        }
                      >
                        <button
                          type="button"
                          aria-label={
                            (selected ? "Remove " : "Add ") + a.symbol
                          }
                          aria-pressed={!!selected}
                          onClick={() =>
                            setAllocations(
                              selected
                                ? allocations.filter(
                                    (x) => x.symbol !== a.symbol,
                                  )
                                : [...allocations, { ...a, weight: 0 }],
                            )
                          }
                        >
                          <AssetIcon symbol={a.symbol} className="w-8 h-8" />
                          <span>
                            <b>{a.symbol}</b>
                            <small>{a.name}</small>
                          </span>
                          <span className="select-check">
                            {selected ? (
                              <Check size={13} />
                            ) : (
                              <Plus size={13} />
                            )}
                          </span>
                        </button>
                        {selected && (
                          <label className="weight-input">
                            <input
                              aria-label={a.symbol + " allocation percent"}
                              type="number"
                              min="1"
                              max="100"
                              value={selected.weight || ""}
                              onChange={(e) =>
                                setAllocations(
                                  allocations.map((x) =>
                                    x.symbol === a.symbol
                                      ? { ...x, weight: Number(e.target.value) }
                                      : x,
                                  ),
                                )
                              }
                            />
                            <span>%</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="form-callout">
                  <Sprout size={17} />
                  <p>
                    This basket is a starting point, not an investment recommendation.
                  </p>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="form-section">
                <label>
                  Beneficiary name
                  <input
                    maxLength={60}
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder="Who is this for?"
                  />
                </label>
                <label>
                  Beneficiary wallet
                  <input
                    className="mono"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                    maxLength={42}
                  />
                </label>
                <p className="field-hint">
                  The intended receiving wallet. The address must be correct
                  before any vault is created.
                </p>
              </div>
            )}
            {step === 2 && (
              <div className="form-section">
                <div className="field-heading">
                  <span>Vesting schedule</span>
                  <span className="field-hint">
                    {schedule.reduce((s, r) => s + r.percent, 0)}% allocated
                  </span>
                </div>
                <p className="field-hint">
                  Each percentage is a share of the original portfolio
                  allocation, not the remaining balance.
                </p>
                <div className="schedule-editor">
                  {schedule.map((r, i) => (
                    <div key={i}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <label>
                        Release date
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) =>
                            setSchedule(
                              schedule.map((x, j) =>
                                j === i ? { ...x, date: e.target.value } : x,
                              ),
                            )
                          }
                          aria-label={"Release " + (i + 1) + " date"}
                        />
                      </label>
                      <label>
                        Release %
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={r.percent || ""}
                          onChange={(e) =>
                            setSchedule(
                              schedule.map((x, j) =>
                                j === i
                                  ? { ...x, percent: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                          aria-label={"Release " + (i + 1) + " percent"}
                        />
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={"Remove release " + (i + 1)}
                        disabled={schedule.length === 1}
                        onClick={() =>
                          setSchedule(schedule.filter((_, j) => i !== j))
                        }
                      >
                        <Minus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                {schedule.length < 6 && (
                  <button
                    type="button"
                    className="text-link plain-button"
                    onClick={() =>
                      setSchedule([...schedule, { date: "", percent: 0 }])
                    }
                  >
                    <Plus size={13} /> Add a release
                  </button>
                )}
                <fieldset>
                  <legend>Vault mode</legend>
                  <div className="mode-options">
                    {(["revocable", "irrevocable"] as const).map((m) => (
                      <label
                        key={m}
                        className={mode === m ? "mode selected" : "mode"}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === m}
                          onChange={() => {
                            setMode(m);
                            setTyped("");
                          }}
                        />
                        <span>
                          <b>
                            {m === "revocable" ? "Revocable" : "Irrevocable"}
                          </b>
                          <small>
                            {m === "revocable"
                              ? "Creator retains the intended ability to revoke."
                              : "Designed to be permanent once sealed on-chain."}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  Succession check-in window
                  <select
                    value={heartbeat}
                    onChange={(e) => setHeartbeat(Number(e.target.value))}
                  >
                    <option value="0">
                      Disabled — no automatic succession
                    </option>
                    <option value="30">Every 30 days</option>
                    <option value="90">Every 90 days</option>
                    <option value="180">Every 180 days</option>
                    <option value="365">Every 365 days</option>
                  </select>
                </label>
                <label>
                  Guardian wallet{" "}
                  <span className="field-hint">
                    Optional · planned bounded oversight
                  </span>
                  <input
                    value={guardian}
                    onChange={(e) => setGuardian(e.target.value)}
                    placeholder="0x…"
                    maxLength={42}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
              </div>
            )}
            {step === 3 && (
              <div className="form-section">
                <div className="letter-editor">
                  <span className="eyebrow">A LETTER FOR THEIR TOMORROW</span>
                  <label className="sr-only" htmlFor="letter">
                    Letter to your beneficiary
                  </label>
                  <textarea
                    id="letter"
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    maxLength={5000}
                    rows={12}
                    placeholder={
                      "Dear " +
                      (beneficiary || "you") +
                      ",\n\nThis is for the life you'll build…"
                    }
                  />
                  <span className="field-hint">
                    {letter.length.toLocaleString()} / 5,000 characters
                  </span>
                </div>
                <p className="field-hint">
                  Optional. Your letter is encrypted end-to-end with AES-256-GCM
                  and stored sealed until milestone releases or succession triggers.
                </p>
              </div>
            )}
            {step === 4 && (
              <div className="form-section">
                <div className="review-card">
                  <div className="review-heading">
                    <Sprout size={23} />
                    <h3>{name}</h3>
                  </div>
                  <dl>
                    <div>
                      <dt>For</dt>
                      <dd>{beneficiary}</dd>
                    </div>
                    <div>
                      <dt>Corpus estimate</dt>
                      <dd>{money(amount)}</dd>
                    </div>
                    <div>
                      <dt>Terms</dt>
                      <dd className="capitalize">{mode}</dd>
                    </div>
                    <div>
                      <dt>Check-ins</dt>
                      <dd>
                        {heartbeat
                          ? "Every " + heartbeat + " days"
                          : "Disabled"}
                      </dd>
                    </div>
                    <div>
                      <dt>Guardian</dt>
                      <dd>{guardian ? "Registered on-chain" : "None"}</dd>
                    </div>
                    <div>
                      <dt>Letter</dt>
                      <dd>{letter ? "Encrypted & sealed" : "Not added"}</dd>
                    </div>
                    <div>
                      <dt>Beneficiary</dt>
                      <dd className="mono break-all">{wallet}</dd>
                    </div>
                    <div>
                      <dt>Grantor</dt>
                      <dd className="mono break-all">
                        {address ? (
                          <span style={{ color: "#152a3b", fontWeight: 600 }}>{address} (Connected)</span>
                        ) : customGrantor ? (
                          <span style={{ color: "#152a3b", fontWeight: 600 }}>{customGrantor}</span>
                        ) : (
                          <span style={{ color: "#a1543c" }}>Not connected</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {!address && (
                    <div style={{ marginTop: "12px", padding: "12px 14px", background: "#f0eae0", border: "1px solid #d8cbb8", borderRadius: "4px" }}>
                      <p className="field-hint" style={{ margin: "0 0 8px 0" }}>Connect your wallet or enter creator address:</p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button type="button" className="button primary" onClick={openConnectModal} style={{ fontSize: "10px", padding: "6px 14px" }}>
                          <Wallet size={12} /> Connect Wallet
                        </button>
                        <input
                          type="text"
                          placeholder="0x..."
                          value={customGrantor}
                          onChange={(e) => setCustomGrantor(e.target.value)}
                          className="mono"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "11px", background: "#fff", border: "1px solid #d8cbb8", borderRadius: "3px" }}
                          spellCheck={false}
                          autoComplete="off"
                          maxLength={42}
                        />
                      </div>
                    </div>
                  )}

                  <div className="review-releases">
                    {schedule.map((r) => (
                      <div key={r.date}>
                        <span>{dateLabel(r.date)}</span>
                        <b>{r.percent}%</b>
                      </div>
                    ))}
                  </div>
                </div>
                {mode === "irrevocable" && (
                  <div className="irrevocable-ack">
                    <LockKeyhole size={20} />
                    <div>
                      <strong>Permanent means permanent.</strong>
                      <p>
                        In an irrevocable vault, the grantor cannot undo, reclaim,
                        or rewrite the terms once sealed.
                      </p>
                      <label>
                        Type IRREVOCABLE to acknowledge
                        <input
                          value={typed}
                          onChange={(e) => setTyped(e.target.value)}
                          autoComplete="off"
                          placeholder="IRREVOCABLE"
                        />
                      </label>
                    </div>
                  </div>
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  <span>
                    I understand that Heirloom creates a programmable trust vault on Robinhood Chain. My assets will be isolated and managed by code according to these terms.
                  </span>
                </label>
              </div>
            )}
            <div className="wizard-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <Link className="text-link" to="/app">
                  Cancel
                </Link>
              )}
              <button type="submit" disabled={busy} className="button primary">
                {busy
                  ? "Sealing trust on-chain…"
                  : step === 4
                    ? "Seal Trust on Robinhood Chain"
                    : "Continue"}
                {step !== 4 && <ArrowRight size={15} />}
              </button>
            </div>
          </form>
        </div>
        <aside className="builder-aside">
          <div className="aside-note">
            <span className="eyebrow">YOUR LEGACY, TAKING SHAPE</span>
            <Sprout size={35} />
            <h3>{name || "Something for tomorrow."}</h3>
            <p>
              {beneficiary
                ? "For " + beneficiary + ". With intention."
                : "A small beginning. A lasting intention."}
            </p>
            <div className="aside-amount">{money(amount || 0)}</div>
            <span className="micro">ILLUSTRATIVE PORTFOLIO</span>
            <div className="allocation-line">
              {allocations.map((a, i) => (
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
                    ][i],
                  }}
                />
              ))}
            </div>
            {allocations.map((a) => (
              <div className="aside-allocation flex items-center justify-between" key={a.symbol}>
                <span className="flex items-center gap-1.5">
                  <AssetIcon symbol={a.symbol} className="w-4 h-4" />
                  {a.symbol}
                </span>
                <span>{a.weight}%</span>
              </div>
            ))}
            <div className="aside-bottom">
              <ShieldCheck size={14} />
              <span>Built around your wishes.</span>
            </div>
          </div>
          <p className="aside-disclaimer">
            All values are illustrative. Saved trusts are written to Robinhood Chain.
          </p>
        </aside>
      </div>

      {/* Error Modal — all validation + API errors go here */}
      {error && (
        <Dialog title="Check your details" onClose={() => setError("")}>
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {error}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => setError("")}>
                Got it
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Success Modal — auto-dismisses after 3 seconds to the new vault */}
      {successData && (
        <Dialog title="Trust Sealed On-Chain" onClose={goToVault}>
          <div className="dialog-body">
            <div className="flex items-start gap-3.5">
              <div className="success-badge">
                <Check size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-lg font-semibold text-[#152a3b] mb-1">
                  {successData.name}
                </h4>
                <p className="text-xs leading-relaxed text-[#6a5e4d] mb-3">
                  Your trust has been created on Robinhood Chain with a dedicated vault address:
                </p>
                <div className="vault-address-snippet">
                  {successData.vaultAddress}
                </div>
                <p className="field-hint mt-3 text-[11px] text-[#8a7c68]">
                  Opening your live vault in {countdown}s…
                </p>
              </div>
            </div>
            <div className="dialog-actions mt-5">
              <button className="button primary" onClick={goToVault}>
                View Vault Now <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
