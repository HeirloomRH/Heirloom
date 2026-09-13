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
} from "lucide-react";
import { DemoNotice, Dialog } from "./product";
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
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("Portfolio");
  const [dialog, setDialog] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setLoading(true);
    try {
      setVault(
        id === "sample"
          ? structuredClone(sample)
          : readVaults().find((v) => v.id === id) || null,
      );
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [id]);
  const update = (patch: Partial<Vault>, message: string) => {
    if (!vault) return;
    const next = { ...vault, ...patch };
    try {
      if (id !== "sample") saveVault(next);
      setVault(next);
      setNotice(
        message + (id === "sample" ? " Sample changes reset on reload." : ""),
      );
      setDialog("");
    } catch {
      setError(
        "Your browser could not save the update. No change was applied.",
      );
    }
  };
  if (loading)
    return (
      <div className="shell loading" role="status">
        Loading your trust…
      </div>
    );
  if (!vault)
    return (
      <div className="shell">
        <DemoNotice />
        <div className="empty-state">
          <h1 className="product-title">This trust isn’t here.</h1>
          <p>
            {error ||
              "It may belong to another browser, or the local demo was removed."}
          </p>
          <Link className="button primary" to="/app">
            Back to workspace <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    );
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(vault.lastCheckIn).getTime()) / 86400000),
  );
  const days = Math.max(0, vault.heartbeat - elapsed);
  const nextRelease = vault.schedule.find(
    (r) => r.date > new Date().toISOString().slice(0, 10),
  );
  return (
    <div className="shell">
      <DemoNotice />
      <div className="product-breadcrumb">
        <Link to="/app">
          <ArrowLeft size={13} /> Your workspace
        </Link>
        <span>{id === "sample" ? "SAMPLE TRUST" : "LOCAL DEMO TRUST"}</span>
      </div>
      <div className="trust-heading">
        <div>
          <div className="trust-kicker">
            <span className="avatar">{vault.beneficiary[0]}</span>
            <span>FOR {vault.beneficiary.toUpperCase()}</span>
            <span className="vault-status">
              {vault.paused ? "Paused" : "Scheduled"}
            </span>
          </div>
          <h1 className="product-title">{vault.name}</h1>
          <p className="product-description">
            A little head start. A lasting intention.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            try {
              exportVault(vault);
              setNotice(
                "Demo plan prepared for download. It includes the beneficiary wallet and letter.",
              );
            } catch {
              setError("Download could not start. Please try again.");
            }
          }}
        >
          <Download size={14} /> Export demo plan
        </button>
      </div>
      {notice && (
        <div className="success-message" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="trust-layout">
        <div>
          <div className="portfolio-summary">
            <div className="spread">
              <span className="eyebrow">ILLUSTRATIVE PORTFOLIO VALUE</span>
              <span className="micro">No assets deposited</span>
            </div>
            <strong>
              {money(vault.amount)}
              <span>.00</span>
            </strong>
            <div className="portfolio-summary-bottom">
              <span>{vault.allocations.length} sample assets</span>
              <span className="capitalize">
                <LockKeyhole size={12} /> {vault.mode} terms
              </span>
            </div>
          </div>
          <div className="trust-tabs" role="tablist" aria-label="Trust details">
            {["Portfolio", "Schedule", "Letter"].map((t, i) => (
              <button
                key={t}
                role="tab"
                id={"tab-" + t}
                aria-selected={tab === t}
                aria-controls={"panel-" + t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const ts = ["Portfolio", "Schedule", "Letter"];
                    const ni =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    setTab(ts[ni]);
                    document.getElementById("tab-" + ts[ni])?.focus();
                  }
                }}
              >
                {t}
                {t === "Letter" && vault.letter && (
                  <span className="tiny-square" />
                )}
              </button>
            ))}
          </div>
          <div
            className="trust-panel"
            role="tabpanel"
            id={"panel-" + tab}
            aria-labelledby={"tab-" + tab}
            tabIndex={0}
          >
            {tab === "Portfolio" && (
              <>
                <div className="spread panel-title">
                  <h2>A foundation for tomorrow.</h2>
                  <span className="micro">SAMPLE ALLOCATIONS</span>
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
                        ][i],
                      }}
                    />
                  ))}
                </div>
                <table className="holdings-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Allocation</th>
                      <th>Demo value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vault.allocations.map((a) => (
                      <tr key={a.symbol}>
                        <td>
                          <span className="asset-symbol">{a.symbol[0]}</span>
                          <span>
                            <b>{a.symbol}</b>
                            <small>{a.name}</small>
                          </span>
                        </td>
                        <td>{a.weight}%</td>
                        <td>{money((vault.amount * a.weight) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="field-hint">
                  Values show your chosen allocation of the demo amount. They
                  are not live quotes, token balances, or projected returns.
                </p>
              </>
            )}
            {tab === "Schedule" && (
              <>
                <h2>Good things, in their own time.</h2>
                <p className="field-hint">
                  Each release is a percentage of the original allocation. No
                  releases execute in this preview.
                </p>
                <div className="release-list">
                  {vault.schedule.map((r, i) => (
                    <div key={r.date}>
                      <span className="release-dot">{i + 1}</span>
                      <div>
                        <b>{dateLabel(r.date)}</b>
                        <span>
                          Scheduled release {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <strong>{r.percent}%</strong>
                      <span>
                        {money((vault.amount * r.percent) / 100)}
                        <small>Illustrative only</small>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === "Letter" && (
              <>
                {vault.letter ? (
                  <div className="trust-letter">
                    <span className="eyebrow">
                      <Mail size={12} /> A LETTER FOR YOUR TOMORROW
                    </span>
                    <p>{vault.letter}</p>
                  </div>
                ) : (
                  <div className="letter-empty">
                    <Mail size={25} />
                    <h3>A story still to be written.</h3>
                    <p>No letter was included with this demo plan.</p>
                  </div>
                )}
                <p className="field-hint">
                  This demo letter is stored as unencrypted text in your
                  browser. Production private delivery is not connected.
                </p>
              </>
            )}
          </div>
        </div>
        <aside className="trust-aside">
          <div className="trust-side-card">
            <div className="spread">
              <h3>The next chapter</h3>
              <Clock3 size={17} />
            </div>
            <strong>
              {nextRelease ? dateLabel(nextRelease.date) : "Schedule complete"}
            </strong>
            <p>
              {nextRelease
                ? nextRelease.percent +
                  "% scheduled release. Timing shown for illustration."
                : "All configured dates have passed. No distributions have been executed by this preview."}
            </p>
          </div>
          <div className="trust-side-card heartbeat">
            <div className="spread">
              <h3>A little check-in</h3>
              <Heart size={17} />
            </div>
            {vault.heartbeat ? (
              <>
                <strong>
                  {days} <span>days remaining</span>
                </strong>
                <p>
                  Last check-in:{" "}
                  {new Date(vault.lastCheckIn).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  . Your window is {vault.heartbeat} days.
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    update(
                      { lastCheckIn: new Date().toISOString() },
                      "Demo check-in recorded. No on-chain heartbeat was sent.",
                    )
                  }
                >
                  <Heart size={13} /> I’m here — demo check-in
                </button>
                <span className="micro">
                  No automated succession in this preview.
                </span>
              </>
            ) : (
              <p>Check-ins are disabled for this plan.</p>
            )}
          </div>
          <div className="trust-side-card">
            <div className="spread">
              <h3>People & permissions</h3>
              <ShieldCheck size={17} />
            </div>
            <div className="person-detail">
              <span>Beneficiary</span>
              <b>{vault.beneficiary}</b>
              <code>{vault.wallet}</code>
            </div>
            <div className="person-detail">
              <span>Guardian</span>
              <b>
                {vault.guardian ? "Named guardian" : "No guardian appointed"}
              </b>
              {vault.guardian && <code>{vault.guardian}</code>}
              <p>
                {vault.guardian
                  ? "Proposed permissions: pause distributions and attest milestones. No authority to redirect the portfolio."
                  : "Guardian roles and milestone attestations are planned for a later phase."}
              </p>
            </div>
          </div>
          <div className="trust-management">
            <button
              className="text-link plain-button"
              onClick={() => setDialog("pause")}
            >
              {vault.paused ? <Play size={13} /> : <Pause size={13} />}{" "}
              {vault.paused ? "Resume demo schedule" : "Pause demo schedule"}
            </button>
            {id !== "sample" && (
              <button
                className="text-link plain-button"
                onClick={() => setDialog("delete")}
              >
                <Trash2 size={13} /> Remove local demo
              </button>
            )}
          </div>
        </aside>
      </div>
      <div className="trust-bottom">
        <LockKeyhole size={15} />
        <p>
          This is a frontend simulation. Real vaults require verified contracts,
          identity and eligibility checks, network transactions, and a
          distribution executor.
        </p>
        <Link to="/docs" hash="boundaries">
          Read the boundaries <ArrowUpRight size={13} />
        </Link>
      </div>
      {dialog === "pause" && (
        <Dialog
          title={vault.paused ? "Resume this demo?" : "Pause this demo?"}
          onClose={() => setDialog("")}
        >
          <p>
            Updates the schedule status in this browser. No assets or on-chain
            permissions are changed.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setDialog("")}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() =>
                update(
                  { paused: !vault.paused },
                  vault.paused ? "Local demo resumed." : "Local demo paused.",
                )
              }
            >
              {vault.paused ? "Resume demo" : "Pause demo"}
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "delete" && (
        <Dialog title="Remove this local demo?" onClose={() => setDialog("")}>
          <p>
            “{vault.name}” and its letter will be removed from this browser.
            Export the demo first if you want to keep it. No on-chain vault is
            affected.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setDialog("")}>
              Keep demo
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                try {
                  removeVault(vault.id);
                  navigate({ to: "/app" });
                } catch {
                  setError("The demo could not be removed. Please try again.");
                  setBusy(false);
                  setDialog("");
                }
              }}
            >
              Remove demo
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
