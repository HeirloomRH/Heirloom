import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  articleGroups,
  articleIds,
  articleSources,
  type ArticleId,
} from "@/lib/heirloom/docs-data";
import { useLocale, useT } from "@/lib/i18n";

export function Docs() {
  const t = useT();
  const { locale } = useLocale();
  const [active, setActive] = useState<ArticleId>("preview");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Article copy is rebuilt whenever the locale changes, so search runs
  // against the language the reader is actually seeing.
  const articles = useMemo(
    () =>
      articleIds.map((id) => ({
        id,
        ...t.docs.articles[id],
        source: articleSources[id],
      })),
    [t],
  );
  const shortNames = t.docs.shortNames;

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
      const topic = articleIds.find((a) => id === a || id.startsWith(a + "-"));
      if (topic) setActive(topic);
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
  const choose = (id: ArticleId) => {
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

  // Chinese has no spaces, so word-count reading time would always be 1.
  const readingMinutes = (text: string) => {
    const units =
      locale === "zh" ? text.length / 400 : text.split(" ").length / 180;
    return Math.max(1, Math.ceil(units));
  };

  return (
    <div className="handbook">
      {menuOpen && (
        <button
          className="handbook-scrim"
          onClick={closeMenu}
          aria-label={t.docs.ui.closeMenu}
        />
      )}
      <aside
        className={`handbook-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label={t.docs.ui.navAriaLabel}
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
          <Link to="/" aria-label={t.common.nav.home}>
            <Brand />
          </Link>
          <span>{t.docs.ui.label}</span>
          <button
            className="handbook-close"
            onClick={closeMenu}
            aria-label={t.docs.ui.closeNav}
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
            placeholder={t.docs.ui.searchPlaceholder}
            aria-label={t.docs.ui.searchAriaLabel}
          />
          <kbd>
            <Command size={10} /> K
          </kbd>
        </label>
        <nav>
          {query.trim() ? (
            <div className="handbook-nav-group">
              <p role="status">
                {filtered.length} {t.docs.ui.resultsSuffix}
              </p>
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
              {!filtered.length && <p>{t.docs.ui.noMatches}</p>}
            </div>
          ) : (
            articleGroups.map((group) => (
              <div className="handbook-nav-group" key={group.key}>
                <p>{t.docs.groups[group.key]}</p>
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
            <i /> {t.docs.ui.sidebarStatus}
          </span>
          <p>{t.docs.ui.sidebarNote}</p>
          <Link to="/create">
            {t.docs.ui.sidebarCta} <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="handbook-content">
        <header className="handbook-toolbar">
          <button
            className="handbook-menu"
            onClick={() => setMenuOpen(true)}
            aria-label={t.docs.ui.openMenu}
            aria-expanded={menuOpen}
          >
            <Menu size={20} />
          </button>
          <div>
            <span>{t.docs.ui.breadcrumbRoot}</span>
            <ChevronRight size={13} />
            <span>{shortNames[active]}</span>
          </div>
          <Link to="/app">
            {t.docs.ui.openApp} <ArrowUpRight size={14} />
          </Link>
        </header>
        {query.trim() ? (
          <section
            className="handbook-results"
            aria-label={t.docs.ui.searchResultsAriaLabel}
          >
            <div className="handbook-results-head">
              <span className="handbook-kicker">{t.docs.ui.searchKicker}</span>
              <button
                onClick={() => setQuery("")}
                aria-label={t.docs.ui.closeResults}
              >
                <X size={18} />
              </button>
            </div>
            <h1>{t.docs.ui.resultsFor(query)}</h1>
            <p role="status">{t.docs.ui.articlesFound(filtered.length)}</p>
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
                <h2>{t.docs.ui.noResultsTitle}</h2>
                <p>{t.docs.ui.noResultsBody}</p>
                <button
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                >
                  {t.docs.ui.clearSearch}
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
                {active === "preview" ? (
                  <>
                    {t.docs.intro.titleLine1}
                    <br />
                    {t.docs.intro.titleLine2}
                  </>
                ) : (
                  article.title
                )}
              </h1>
              <p className="handbook-deck">
                {active === "preview"
                  ? t.docs.intro.deck
                  : t.docs.intro.deckTemplate(
                      locale === "zh"
                        ? shortNames[active]
                        : shortNames[active].toLowerCase(),
                    )}
              </p>
              <div className="handbook-article-tools">
                <span>
                  <BookOpen size={14} />{" "}
                  {t.docs.ui.minRead(
                    readingMinutes(article.text + article.extra),
                  )}
                </span>
                <button onClick={copy}>
                  {copied ? <Check size={14} /> : <LinkIcon size={14} />}{" "}
                  {copied ? t.docs.ui.linkCopied : t.docs.ui.copyLink}
                </button>
              </div>
              {copyFailed && (
                <p className="handbook-copy-fallback" role="status">
                  {t.docs.ui.copyFallback(active)}
                </p>
              )}
              {active === "preview" && (
                <div className="handbook-cover">
                  <div className="handbook-cover-top">
                    <span>{t.docs.intro.coverTop}</span>
                    <span>{t.docs.intro.coverIndex}</span>
                  </div>
                  <div className="handbook-cover-middle">
                    <Mark />
                    <span>
                      {t.docs.intro.coverLine1}
                      <br />
                      {t.docs.intro.coverLine2}
                    </span>
                  </div>
                  <div className="handbook-cover-bottom">
                    <span>{t.docs.intro.coverA}</span>
                    <i />
                    <span>{t.docs.intro.coverB}</span>
                    <i />
                    <span>{t.docs.intro.coverC}</span>
                  </div>
                </div>
              )}
              <section id={`${active}-overview`}>
                <h2>{t.docs.ui.overviewHeading}</h2>
                <p>{article.text}</p>
              </section>
              <section id={`${active}-preview`} className="handbook-callout">
                <div>
                  <Info size={18} />
                  <h2>{t.docs.ui.previewHeading}</h2>
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
                    <small>{t.docs.ui.primarySource}</small>
                    {article.sourceLabel}
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              )}
              {active === "preview" && (
                <section id="preview-next">
                  <h2>{t.docs.intro.startHeading}</h2>
                  <div className="handbook-start-links">
                    <Link to="/create">
                      <b>01</b>
                      <span>
                        {t.docs.intro.start1Title}
                        <small>{t.docs.intro.start1Body}</small>
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                    <Link to="/vault" search={{ id: "sample" }}>
                      <b>02</b>
                      <span>
                        {t.docs.intro.start2Title}
                        <small>{t.docs.intro.start2Body}</small>
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
                      <ArrowLeft size={13} /> {t.docs.ui.previousLabel}
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
                      {t.docs.ui.nextLabel} <ArrowRight size={13} />
                    </small>
                    <span>{shortNames[articles[index + 1].id]}</span>
                  </a>
                )}
              </div>
              <footer className="handbook-article-footer">
                <span>{t.docs.ui.footerLabel}</span>
                <Link to="/roadmap">
                  {t.docs.ui.footerCta} <ArrowUpRight size={12} />
                </Link>
              </footer>
            </article>
            <aside className="handbook-toc">
              <p>{t.docs.ui.tocLabel}</p>
              <a href={`#${active}-overview`}>{t.docs.ui.tocOverview}</a>
              <a href={`#${active}-preview`}>{t.docs.ui.tocPreview}</a>
              {active === "preview" && (
                <a href="#preview-next">{t.docs.ui.tocNext}</a>
              )}
              <div>
                <span>{t.docs.ui.tocAsideTitle}</span>
                <p>{t.docs.ui.tocAsideBody}</p>
                <Link to="/create">
                  {t.docs.ui.tocAsideCta} <ArrowUpRight size={13} />
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
