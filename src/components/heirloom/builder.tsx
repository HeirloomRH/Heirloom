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
} from "lucide-react";
import { DemoNotice } from "./product";
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
  "Read the plan carefully before saving your demo.",
];
export function Builder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(10000);
  const [allocations, setAllocations] = useState<Allocation[]>([
    { ...assets[0], weight: 40 },
    { ...assets[1], weight: 35 },
    { ...assets[3], weight: 25 },
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
  useEffect(() => {
    document.getElementById("builder-heading")?.focus();
  }, [step]);
  const total = allocations.reduce((s, a) => s + a.weight, 0);
  const validate = (n: number) => {
    if (n === 0) {
      if (!name.trim()) return "Give your trust a name.";
      return validateAllocations(amount, allocations);
    }
    if (n === 1) {
      if (!beneficiary.trim()) return "Enter the beneficiary’s name.";
      if (!validAddress(wallet.trim()))
        return "Enter a valid, non-zero Ethereum-style wallet address (0x + 40 hex characters).";
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
    setError(err);
    if (!err) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };
  const save = () => {
    for (let n = 0; n < 3; n++) {
      const err = validate(n);
      if (err) {
        setStep(n);
        setError(err);
        return;
      }
    }
    if (!ack) {
      setError("Please acknowledge that this is a local demo.");
      return;
    }
    if (mode === "irrevocable" && typed !== "IRREVOCABLE") {
      setError(
        "Type IRREVOCABLE to confirm you understand the intended permanent terms.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const v: Vault = {
      id: crypto.randomUUID(),
      name: name.trim(),
      beneficiary: beneficiary.trim(),
      wallet: wallet.trim(),
      amount,
      allocations,
      schedule,
      mode,
      heartbeat,
      guardian: guardian.trim(),
      letter,
      createdAt: now,
      lastCheckIn: now,
      paused: false,
      demo: true,
    };
    try {
      saveVault(v);
      navigate({ to: "/vault", search: { id: v.id } });
    } catch {
      setError(
        "Your browser could not save this demo. Allow site storage or try a different browser. Your entries are still here.",
      );
      setBusy(false);
    }
  };
  return (
    <div className="shell">
      <DemoNotice />
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
                    placeholder="e.g. Emma’s tomorrow"
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
                  Sample assets only. No live prices or verified eligibility.
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
                          <span className="asset-symbol">
                            {a.symbol === "USDG" ? "$" : a.symbol[0]}
                          </span>
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
                    This basket is a starting point for a demo, not an
                    investment recommendation.
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
                  before any production vault is created.
                </p>
                <button
                  type="button"
                  className="text-link plain-button"
                  onClick={() => {
                    setBeneficiary("Emma");
                    setWallet("0x1111111111111111111111111111111111111111");
                  }}
                >
                  Use fictional demo beneficiary <ArrowRight size={13} />
                </button>
                <div className="form-callout">
                  <Heart size={18} />
                  <p>
                    A real deployment will require verified eligibility for the
                    creator and beneficiary. No personal verification is
                    performed in this demo.
                  </p>
                </div>
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
                <p className="field-hint">
                  A production grace period and succession executor are still to
                  be configured. This demo never triggers transfers.
                </p>
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
                      ",\n\nThis is for the life you’ll build…"
                    }
                  />
                  <span className="field-hint">
                    {letter.length.toLocaleString()} / 5,000 characters
                  </span>
                </div>
                <p className="field-hint">
                  Optional. Saved as plain text in this browser; avoid sensitive
                  information. Private letter storage is a production
                  integration.
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
                      <dt>Demo portfolio</dt>
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
                      <dd>{guardian ? "Included in demo plan" : "None"}</dd>
                    </div>
                    <div>
                      <dt>Letter</dt>
                      <dd>{letter ? "Included" : "Not added"}</dd>
                    </div>
                  </dl>
                  <p className="field-hint mono break-all">
                    Beneficiary: {wallet}
                  </p>
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
                        In a production irrevocable vault, the creator cannot
                        undo or rewrite the sealed terms. This local demo does
                        not create such a vault.
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
                    I understand this saves a local demo only. It does not
                    create a legal trust, hold assets, or execute an on-chain
                    transaction.
                  </span>
                </label>
              </div>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
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
                  ? "Saving demo…"
                  : step === 4
                    ? "Save demo trust"
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
              <div className="aside-allocation" key={a.symbol}>
                <span>{a.symbol}</span>
                <span>{a.weight}%</span>
              </div>
            ))}
            <div className="aside-bottom">
              <ShieldCheck size={14} />
              <span>Built around your wishes.</span>
            </div>
          </div>
          <p className="aside-disclaimer">
            You’re exploring the Heirloom frontend. All values are illustrative,
            and saved plans stay in this browser.
          </p>
        </aside>
      </div>
    </div>
  );
}
