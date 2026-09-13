import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  ArrowUpRight,
  Search,
  Sprout,
  Heart,
  Clock3,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { Mark } from "./chrome";
import { DemoNotice } from "./product";
import { readVaults, money, dateLabel, type Vault } from "@/lib/heirloom/vault";
export function Dashboard() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState(false);
  useEffect(() => {
    try {
      setVaults(readVaults());
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);
  const filtered = vaults.filter(
    (v) =>
      (v.name + " " + v.beneficiary)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || (filter === "paused" ? v.paused : !v.paused)),
  );
  return (
    <div className="shell">
      <DemoNotice />
      <div className="workspace-title">
        <div>
          <p className="eyebrow">YOUR FAMILY WORKSPACE</p>
          <h1 className="product-title">For all their tomorrows.</h1>
          <p className="product-description">
            Good intentions, with a plan behind them.
          </p>
        </div>
        <Link className="button primary" to="/create">
          <Plus size={15} /> Create a trust
        </Link>
      </div>
      <div className="workspace-stats">
        <div>
          <span>Demo portfolio value</span>
          <strong>
            {money(vaults.reduce((n, v) => n + v.amount, 0))}
            <small>.00</small>
          </strong>
          <span>Illustrative, not held assets</span>
        </div>
        <div>
          <span>Your demo trusts</span>
          <strong>{String(vaults.length).padStart(2, "0")}</strong>
          <span>Saved on this browser</span>
        </div>
        <div>
          <span>People you’re building for</span>
          <strong>
            {String(
              new Set(vaults.map((v) => v.wallet.toLowerCase())).size,
            ).padStart(2, "0")}
          </strong>
          <span>Named beneficiary wallets</span>
        </div>
      </div>
      <div className="workspace-tools">
        <div>
          <h2>Your trusts</h2>
          <span>{vaults.length}</span>
        </div>
        <label className="search-input">
          <Search size={15} />
          <input
            aria-label="Search trusts"
            placeholder="Search your trusts…"
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
          <option value="scheduled">Scheduled</option>
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
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      {loading ? (
        <div className="empty-state" role="status">
          Loading your local workspace…
        </div>
      ) : filtered.length ? (
        <div className={list ? "vault-grid list" : "vault-grid"}>
          {filtered.map((v) => (
            <Link className="vault-card" to="/vault" search={{ id: v.id }} key={v.id}>
              <div className="spread">
                <span className="avatar">{v.beneficiary[0]}</span>
                <span className="vault-status">
                  {v.paused ? "Paused" : "Scheduled"}
                </span>
              </div>
              <h3>{v.name}</h3>
              <p>For {v.beneficiary}</p>
              <strong>{money(v.amount)}</strong>
              <span className="micro">ILLUSTRATIVE PORTFOLIO</span>
              <div className="allocation-line">
                {v.allocations.map((a, i) => (
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
              <div className="spread card-bottom">
                <span>
                  <Clock3 size={12} /> {dateLabel(v.schedule[0].date)}
                </span>
                <ArrowUpRight size={17} />
              </div>
            </Link>
          ))}
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
              ? "Try a different name or status."
              : "Create your first demo trust, or explore what a finished plan can look like."}
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
              <Link className="text-link" to="/vault" search={{ id: "sample" }}>
                Explore Emma’s sample trust <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}
      <div className="workspace-bottom">
        <Heart size={19} />
        <div>
          <h3>The plan is only part of the story.</h3>
          <p>A personal letter gives your portfolio a little more meaning.</p>
        </div>
        <Link className="text-link" to="/docs" hash="letters">
          Learn about letters <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
