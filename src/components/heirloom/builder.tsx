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
import { useT } from "@/lib/i18n";

export function Builder() {
  const t = useT();
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
      if (!name.trim()) return t.builder.errors.nameRequired;
      const code = validateAllocations(amount, allocations);
      return code ? t.builder.errors[code] : "";
    }
    if (n === 1) {
      if (!beneficiary.trim()) return t.builder.errors.beneficiaryRequired;
      if (!validAddress(wallet.trim()))
        return t.builder.errors.beneficiaryWallet;
    }
    if (n === 2) {
      const code = validateSchedule(schedule);
      if (code) return t.builder.errors[code];
      if (guardian && !validAddress(guardian.trim()))
        return t.builder.errors.guardianWallet;
      if (guardian && guardian.toLowerCase() === wallet.toLowerCase())
        return t.builder.errors.guardianSameAsBeneficiary;
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
      setError(t.builder.errors.grantorRequired);
      return;
    }
    if (!ack) {
      setError(t.builder.errors.ackRequired);
      return;
    }
    if (mode === "irrevocable" && typed !== "IRREVOCABLE") {
      setError(t.builder.errors.typeIrrevocable);
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
      setError(err.message || t.builder.errors.createFailed);
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <div className="product-breadcrumb">
        <Link to="/app">
          <ArrowLeft size={13} /> {t.builder.breadcrumbBack}
        </Link>
        <span>{t.builder.breadcrumbCurrent}</span>
      </div>
      <div className="builder-layout">
        <div>
          <div
            className="wizard-steps"
            aria-label={t.builder.progressAriaLabel}
          >
            {t.builder.steps.map((x, i) => (
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
            ))}
          </div>
          <p className="eyebrow">{t.builder.stepCounter(step + 1)}</p>
          <h1 className="product-title" id="builder-heading" tabIndex={-1}>
            {t.builder.titles[step]}
          </h1>
          <p className="product-description">
            {t.builder.descriptions[step]}
          </p>
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
                  {t.builder.step0.nameLabel}
                  <input
                    autoComplete="off"
                    maxLength={70}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.builder.step0.namePlaceholder}
                  />
                </label>
                <label>
                  {t.builder.step0.amountLabel}{" "}
                  <span className="field-hint">
                    {t.builder.step0.amountHint}
                  </span>
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      aria-label={t.builder.step0.amountAriaLabel}
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
                  <span>{t.builder.step0.basketHeading}</span>
                  <span
                    className={total === 100 ? "text-green" : "text-orange"}
                  >
                    {total}% / 100%
                  </span>
                </div>
                <p className="field-hint">{t.builder.step0.basketHint}</p>
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
                            selected
                              ? t.builder.step0.removeAsset(a.symbol)
                              : t.builder.step0.addAsset(a.symbol)
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
                              aria-label={t.builder.step0.allocationPercent(
                                a.symbol,
                              )}
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
                  <p>{t.builder.step0.callout}</p>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="form-section">
                <label>
                  {t.builder.step1.nameLabel}
                  <input
                    maxLength={60}
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder={t.builder.step1.namePlaceholder}
                  />
                </label>
                <label>
                  {t.builder.step1.walletLabel}
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
                <p className="field-hint">{t.builder.step1.hint}</p>
              </div>
            )}
            {step === 2 && (
              <div className="form-section">
                <div className="field-heading">
                  <span>{t.builder.step2.scheduleHeading}</span>
                  <span className="field-hint">
                    {t.builder.step2.allocated(
                      schedule.reduce((sum, r) => sum + r.percent, 0),
                    )}
                  </span>
                </div>
                <p className="field-hint">{t.builder.step2.scheduleHint}</p>
                <div className="schedule-editor">
                  {schedule.map((r, i) => (
                    <div key={i}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <label>
                        {t.builder.step2.releaseDate}
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
                          aria-label={t.builder.step2.releaseDateAria(i + 1)}
                        />
                      </label>
                      <label>
                        {t.builder.step2.releasePercent}
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
                          aria-label={t.builder.step2.releasePercentAria(
                            i + 1,
                          )}
                        />
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={t.builder.step2.removeRelease(i + 1)}
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
                    <Plus size={13} /> {t.builder.step2.addRelease}
                  </button>
                )}
                <fieldset>
                  <legend>{t.builder.step2.modeLegend}</legend>
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
                            {m === "revocable"
                              ? t.builder.step2.revocable
                              : t.builder.step2.irrevocable}
                          </b>
                          <small>
                            {m === "revocable"
                              ? t.builder.step2.revocableNote
                              : t.builder.step2.irrevocableNote}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label>
                  {t.builder.step2.heartbeatLabel}
                  <select
                    value={heartbeat}
                    onChange={(e) => setHeartbeat(Number(e.target.value))}
                  >
                    <option value="0">
                      {t.builder.step2.heartbeatDisabled}
                    </option>
                    {[30, 90, 180, 365].map((days) => (
                      <option key={days} value={String(days)}>
                        {t.builder.step2.heartbeatEvery(days)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.builder.step2.guardianLabel}{" "}
                  <span className="field-hint">
                    {t.builder.step2.guardianHint}
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
                  <span className="eyebrow">{t.builder.step3.eyebrow}</span>
                  <label className="sr-only" htmlFor="letter">
                    {t.builder.step3.srLabel}
                  </label>
                  <textarea
                    id="letter"
                    value={letter}
                    onChange={(e) => setLetter(e.target.value)}
                    maxLength={5000}
                    rows={12}
                    placeholder={t.builder.step3.placeholder(
                      beneficiary || t.builder.step3.placeholderFallback,
                    )}
                  />
                  <span className="field-hint">
                    {t.builder.step3.counter(letter.length.toLocaleString())}
                  </span>
                </div>
                <p className="field-hint">{t.builder.step3.hint}</p>
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
                      <dt>{t.builder.review.for}</dt>
                      <dd>{beneficiary}</dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.corpus}</dt>
                      <dd>{money(amount)}</dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.terms}</dt>
                      <dd>
                        {mode === "revocable"
                          ? t.builder.review.modeRevocable
                          : t.builder.review.modeIrrevocable}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.checkIns}</dt>
                      <dd>
                        {heartbeat
                          ? t.builder.review.checkInsEvery(heartbeat)
                          : t.builder.review.checkInsDisabled}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.guardian}</dt>
                      <dd>
                        {guardian
                          ? t.builder.review.guardianRegistered
                          : t.builder.review.guardianNone}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.letter}</dt>
                      <dd>
                        {letter
                          ? t.builder.review.letterSealed
                          : t.builder.review.letterNone}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.beneficiary}</dt>
                      <dd className="mono break-all">{wallet}</dd>
                    </div>
                    <div>
                      <dt>{t.builder.review.grantor}</dt>
                      <dd className="mono break-all">
                        {address ? (
                          <span style={{ color: "#152a3b", fontWeight: 600 }}>
                            {address} {t.builder.review.connectedSuffix}
                          </span>
                        ) : customGrantor ? (
                          <span style={{ color: "#152a3b", fontWeight: 600 }}>{customGrantor}</span>
                        ) : (
                          <span style={{ color: "#a1543c" }}>
                            {t.builder.review.notConnected}
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {!address && (
                    <div style={{ marginTop: "12px", padding: "12px 14px", background: "#f0eae0", border: "1px solid #d8cbb8", borderRadius: "4px" }}>
                      <p className="field-hint" style={{ margin: "0 0 8px 0" }}>
                        {t.builder.review.connectPrompt}
                      </p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button type="button" className="button primary" onClick={openConnectModal} style={{ fontSize: "10px", padding: "6px 14px" }}>
                          <Wallet size={12} /> {t.builder.review.connectWallet}
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
                      <strong>{t.builder.ack.title}</strong>
                      <p>{t.builder.ack.body}</p>
                      <label>
                        {t.builder.ack.typeLabel}
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
                  <span>{t.builder.ack.checkbox}</span>
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
                  <ArrowLeft size={14} /> {t.builder.actions.back}
                </button>
              ) : (
                <Link className="text-link" to="/app">
                  {t.builder.actions.cancel}
                </Link>
              )}
              <button type="submit" disabled={busy} className="button primary">
                {busy
                  ? t.builder.actions.sealing
                  : step === 4
                    ? t.builder.actions.seal
                    : t.builder.actions.continue}
                {step !== 4 && <ArrowRight size={15} />}
              </button>
            </div>
          </form>
        </div>
        <aside className="builder-aside">
          <div className="aside-note">
            <span className="eyebrow">{t.builder.aside.eyebrow}</span>
            <Sprout size={35} />
            <h3>{name || t.builder.aside.untitled}</h3>
            <p>
              {beneficiary
                ? t.builder.aside.forSomeone(beneficiary)
                : t.builder.aside.noBeneficiary}
            </p>
            <div className="aside-amount">{money(amount || 0)}</div>
            <span className="micro">{t.builder.aside.illustrative}</span>
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
              <span>{t.builder.aside.bottom}</span>
            </div>
          </div>
          <p className="aside-disclaimer">{t.builder.aside.disclaimer}</p>
        </aside>
      </div>

      {/* Error Modal — all validation + API errors go here */}
      {error && (
        <Dialog
          title={t.builder.errorDialog.title}
          onClose={() => setError("")}
        >
          <div className="dialog-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                {error}
              </p>
            </div>
            <div className="dialog-actions">
              <button className="button primary" onClick={() => setError("")}>
                {t.builder.errorDialog.gotIt}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Success Modal — auto-dismisses after 3 seconds to the new vault */}
      {successData && (
        <Dialog title={t.builder.success.title} onClose={goToVault}>
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
                  {t.builder.success.body}
                </p>
                <div className="vault-address-snippet">
                  {successData.vaultAddress}
                </div>
                <p className="field-hint mt-3 text-[11px] text-[#8a7c68]">
                  {t.builder.success.opening(countdown)}
                </p>
              </div>
            </div>
            <div className="dialog-actions mt-5">
              <button className="button primary" onClick={goToVault}>
                {t.builder.success.viewVault} <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
