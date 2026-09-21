import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ConnectButton } from "../wallet/ConnectButton";
import { ContractAddressBadge } from "./contract-address-badge";
import { LanguageToggle } from "./language-toggle";
import { useT } from "@/lib/i18n";
export function Mark({ className = "" }: { className?: string }) {
  const maskId = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 905 925"
      fill="currentColor"
      aria-hidden="true"
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="905"
          height="925"
          style={{ maskType: "alpha" }}
        >
          <image
            href="/brand/heirloom-logo-transparent.png"
            x="-175"
            y="-196"
            width="1254"
            height="1254"
          />
        </mask>
      </defs>
      <rect width="905" height="925" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function Brand() {
  const t = useT();
  return (
    <span className="brand">
      <Mark />
      <span>{t.common.brand}</span>
    </span>
  );
}

export function SiteHeader() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="site-header">
      <div className="shell nav-inner">
        <Link
          to="/"
          aria-label={t.common.nav.home}
          onClick={() => setOpen(false)}
        >
          <Brand />
        </Link>
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label={t.common.nav.mainNavigation}
        >
          <Link to="/" hash="how-it-works" onClick={() => setOpen(false)}>
            {t.common.nav.howItWorks}
          </Link>
          <Link
            className={path === "/docs" ? "active" : ""}
            to="/docs"
            onClick={() => setOpen(false)}
          >
            {t.common.nav.docs}
          </Link>
          <Link
            className={path === "/whitepaper" ? "active" : ""}
            to="/whitepaper"
            onClick={() => setOpen(false)}
          >
            {t.common.nav.whitepaper}
          </Link>
          <Link
            className={path === "/roadmap" ? "active" : ""}
            to="/roadmap"
            onClick={() => setOpen(false)}
          >
            {t.common.nav.roadmap}
          </Link>
          <Link className="nav-app" to="/app" onClick={() => setOpen(false)}>
            {t.common.nav.openApp} <ArrowUpRight size={15} />
          </Link>
          <LanguageToggle className="nav-lang" />
          <div className="hidden sm:inline-block">
            <ConnectButton />
          </div>
        </nav>
        <div className="sm:hidden mr-2">
          <ConnectButton />
        </div>
        <button
          className="menu-toggle icon-button"
          aria-label={open ? t.common.nav.closeMenu : t.common.nav.openMenu}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <Link to="/" aria-label={t.common.nav.home}>
            <Brand />
          </Link>
          <div>
            <Link to="/docs">{t.common.footer.documentation}</Link>
            <Link to="/whitepaper">{t.common.footer.whitepaper}</Link>
            <Link to="/roadmap">{t.common.footer.roadmap}</Link>
            <a
              href="https://x.com/heirloomrh"
              target="_blank"
              rel="noopener noreferrer"
              title={t.common.footer.twitterTitle}
            >
              {t.common.footer.twitter}
            </a>
            <a
              href="https://t.me/heirloomportal"
              target="_blank"
              rel="noopener noreferrer"
              title={t.common.footer.telegramTitle}
            >
              {t.common.footer.telegram}
            </a>
            <Link to="/docs" hash="boundaries">{t.common.footer.risks}</Link>
          </div>
          <Link to="/create">
            {t.common.footer.buildLegacy} <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Contract Address Section */}
        <div className="footer-ca-wrap">
          <ContractAddressBadge theme="dark" />
        </div>

        <div className="footer-word" aria-hidden="true">
          <Mark />
          <span>{t.common.brand}</span>
        </div>
        <div className="footer-bottom">
          <span>{t.common.footer.copyright}</span>
          <span>{t.common.footer.tagline}</span>
          <span>{t.common.footer.chain}</span>
        </div>
        <p className="fine-print">{t.common.footer.finePrint}</p>
      </div>
    </footer>
  );
}
