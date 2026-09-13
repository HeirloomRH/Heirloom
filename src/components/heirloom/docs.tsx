import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  X,
  Menu,
  BookOpen,
  Info,
  Check,
  Link as LinkIcon,
  Command,
} from "lucide-react";
import { Brand, Mark } from "./chrome";
import { articles } from "@/lib/heirloom/docs-data";

const groups = [
  { name: "GETTING STARTED", ids: ["preview", "vaults"] },
  {
    name: "BUILD YOUR PLAN",
    ids: [
      "portfolio",
      "schedules",
      "heartbeat",
      "guardians",
      "modes",
      "letters",
    ],
  },
  { name: "PROTOCOL", ids: ["network", "boundaries", "token"] },
];
const shortNames: Record<string, string> = {
  preview: "Introduction",
  vaults: "How vaults work",
  portfolio: "Portfolio & assets",
  schedules: "Release schedules",
  heartbeat: "Heartbeats",
  guardians: "Guardians",
  modes: "Vault terms",
  letters: "Personal letters",
  network: "Robinhood Chain",
  boundaries: "Risks & boundaries",
  token: "$HEIR roadmap",
};

export function Docs() {
  const [active, setActive] = useState("preview");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(".handbook-menu")?.focus(),
    );
  };
  useEffect(() => {
    if (menuOpen) input.current?.focus();
  }, [menuOpen]);
  const index = articles.findIndex((a) => a.id === active);
  const article = articles[index] ?? articles[0];
  const filtered = articles.filter((a) =>
    `${a.title} ${a.text} ${a.extra}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    const readHash = () => {
      const id = window.location.hash.slice(1);
      const topic = articles.find(
        (a) => id === a.id || id.startsWith(a.id + "-"),
      );
      if (topic) setActive(topic.id);
      else if (!id) setActive("preview");
    };
    readHash();
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.innerWidth <= 900) setMenuOpen(true);
        requestAnimationFrame(() => input.current?.focus());
      }
      if (e.key === "Escape") {
        setQuery("");
        closeMenu();
      }
    };
    window.addEventListener("hashchange", readHash);
    window.addEventListener("popstate", readHash);
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("hashchange", readHash);
      window.removeEventListener("popstate", readHash);
      window.removeEventListener("keydown", keys);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);
  const choose = (id: string) => {
    window.history.pushState(null, "", `#${id}`);
    setActive(id);
    setQuery("");
    setMenuOpen(false);
    setCopied(false);
    setCopyFailed(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/docs/#${active}`,
      );
      setCopied(true);
      setCopyFailed(false);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };
  return (
    <div className="handbook">
      {menuOpen && (
        <button
          className="handbook-scrim"
          onClick={closeMenu}
          aria-label="Close documentation menu"
        />
      )}
      <aside
        className={`handbook-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Documentation navigation"
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen || undefined}
        onKeyDown={(e) => {
          if (!menuOpen || e.key !== "Tab") return;
          const items = e.currentTarget.querySelectorAll<HTMLElement>(
            "a[href],button,input",
          );
          const first = items[0],
            last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="handbook-brand">
          <Link to="/" aria-label="Heirloom home">
            <Brand />
          </Link>
          <span>DOCS</span>
          <button
            className="handbook-close"
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <label className="handbook-search">
          <Search size={16} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an answer…"
            aria-label="Search documentation"
          />
          <kbd>
            <Command size={10} /> K
          </kbd>
        </label>
        <nav>
          {query.trim() ? (
            <div className="handbook-nav-group">
              <p role="status">{filtered.length} RESULTS</p>
              {filtered.map((a) => (
                <a
                  href={`#${a.id}`}
                  key={a.id}
                  onClick={(e) => {
                    e.preventDefault();
                    choose(a.id);
                  }}
                >
                  {shortNames[a.id]}
                  <ChevronRight size={14} />
                </a>
              ))}
              {!filtered.length && <p>Try another search term.</p>}
            </div>
          ) : (
            groups.map((group) => (
              <div className="handbook-nav-group" key={group.name}>
                <p>{group.name}</p>
                {group.ids.map((id) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    aria-current={active === id ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(id);
                    }}
                  >
                    <span>{shortNames[id]}</span>
                    {active === id && <ChevronRight size={14} />}
                  </a>
                ))}
              </div>
            ))
          )}
        </nav>
        <div className="handbook-side-bottom">
          <span className="handbook-status">
            <i /> Frontend preview
          </span>
          <p>A working demo of a long-term idea.</p>
          <Link to="/create">
            Try the builder <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="handbook-content">
        <header className="handbook-toolbar">
          <button
            className="handbook-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open documentation menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} />
          </button>
          <div>
            <span>Documentation</span>
            <ChevronRight size={13} />
            <span>{shortNames[active]}</span>
          </div>
          <Link to="/app">
            Open app <ArrowUpRight size={14} />
          </Link>
        </header>
        {query.trim() ? (
          <section className="handbook-results" aria-label="Search results">
            <div className="handbook-results-head">
              <span className="handbook-kicker">SEARCH THE HANDBOOK</span>
              <button
                onClick={() => setQuery("")}
                aria-label="Close search results"
              >
                <X size={18} />
              </button>
            </div>
            <h1>Results for “{query}”</h1>
            <p role="status">
              {filtered.length} {filtered.length === 1 ? "article" : "articles"}{" "}
              found
            </p>
            {filtered.map((a) => (
              <button
                className="handbook-result"
                onClick={() => choose(a.id)}
                key={a.id}
              >
                <span>
                  <small>{a.tag}</small>
                  <strong>{a.title}</strong>
                  <p>{a.text}</p>
                </span>
                <ArrowRight size={20} />
              </button>
            ))}
            {!filtered.length && (
              <div className="handbook-no-results">
                <BookOpen size={30} />
                <h2>No answers found yet.</h2>
                <p>Try “guardian”, “schedule”, or “portfolio”.</p>
                <button
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                >
                  Clear search
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="handbook-reading-layout">
            <article className="handbook-article" key={active}>
              <div className="handbook-article-meta">
                <span className="handbook-kicker">{article.tag}</span>
                <span>
                  {String(index + 1).padStart(2, "0")} / {articles.length}
                </span>
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {active === "preview"
                  ? "A clear plan.\nA lasting legacy."
                  : article.title}
              </h1>
              <p className="handbook-deck">
                {active === "preview"
                  ? "The essentials of Heirloom, from your first portfolio to the wishes that guide it."
                  : `A practical guide to ${shortNames[active].toLowerCase()} in Heirloom.`}
              </p>
              <div className="handbook-article-tools">
                <span>
                  <BookOpen size={14} />{" "}
                  {Math.max(
                    1,
                    Math.ceil(
                      (article.text + article.extra).split(" ").length / 180,
                    ),
                  )}{" "}
                  min read
                </span>
                <button onClick={copy}>
                  {copied ? <Check size={14} /> : <LinkIcon size={14} />}{" "}
                  {copied ? "Link copied" : "Copy link"}
                </button>
              </div>
              {copyFailed && (
                <p className="handbook-copy-fallback" role="status">
                  Copy this link: /docs/#{active}
                </p>
              )}
              {active === "preview" && (
                <div className="handbook-cover">
                  <div className="handbook-cover-top">
                    <span>THE HEIRLOOM HANDBOOK</span>
                    <span>01 — BEGIN HERE</span>
                  </div>
                  <div className="handbook-cover-middle">
                    <Mark />
                    <span>
                      Good intentions.
                      <br />
                      Clear instructions.
                    </span>
                  </div>
                  <div className="handbook-cover-bottom">
                    <span>Portfolio</span>
                    <i />
                    <span>People</span>
                    <i />
                    <span>Purpose</span>
                  </div>
                </div>
              )}
              <section id={`${active}-overview`}>
                <h2>Overview</h2>
                <p>{article.text}</p>
              </section>
              <section id={`${active}-preview`} className="handbook-callout">
                <div>
                  <Info size={18} />
                  <h2>In the current preview</h2>
                </div>
                <p>{article.extra}</p>
              </section>
              {article.source && (
                <a
                  className="handbook-source"
                  href={article.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    <small>PRIMARY SOURCE</small>
                    {article.sourceLabel}
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              )}
              {active === "preview" && (
                <section id="preview-next">
                  <h2>Make your first plan</h2>
                  <div className="handbook-start-links">
                    <Link to="/create">
                      <b>01</b>
                      <span>
                        Create a demo trust
                        <small>
                          Portfolio, beneficiary, terms, and letter.
                        </small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                    <Link to="/vault" search={{ id: "sample" }}>
                      <b>02</b>
                      <span>
                        Explore a sample
                        <small>See how the pieces come together.</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </section>
              )}
              <div className="handbook-next-prev">
                {index > 0 ? (
                  <a
                    href={`#${articles[index - 1].id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(articles[index - 1].id);
                    }}
                  >
                    <small>
                      <ArrowLeft size={13} /> PREVIOUS
                    </small>
                    <span>{shortNames[articles[index - 1].id]}</span>
                  </a>
                ) : (
                  <span />
                )}
                {index < articles.length - 1 && (
                  <a
                    href={`#${articles[index + 1].id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(articles[index + 1].id);
                    }}
                  >
                    <small>
                      NEXT <ArrowRight size={13} />
                    </small>
                    <span>{shortNames[articles[index + 1].id]}</span>
                  </a>
                )}
              </div>
              <footer className="handbook-article-footer">
                <span>Heirloom documentation</span>
                <Link to="/roadmap">
                  View the roadmap <ArrowUpRight size={12} />
                </Link>
              </footer>
            </article>
            <aside className="handbook-toc">
              <p>ON THIS PAGE</p>
              <a href={`#${active}-overview`}>Overview</a>
              <a href={`#${active}-preview`}>In this preview</a>
              {active === "preview" && (
                <a href="#preview-next">Make your first plan</a>
              )}
              <div>
                <span>Built with intention.</span>
                <p>Start small. Make the details count.</p>
                <Link to="/create">
                  Create a trust <ArrowUpRight size={13} />
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
