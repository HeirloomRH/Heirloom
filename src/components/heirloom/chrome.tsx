import { Link } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { ArrowUpRight, Menu, X, MessageCircle } from "lucide-react";
import { ConnectButton } from "../wallet/ConnectButton";
import { Dialog } from "./product";
import { ContractAddressBadge } from "./contract-address-badge";
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
  return (
    <span className="brand">
      <Mark />
      <span>heirloom</span>
    </span>
  );
}
export function SiteHeader() {
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
          aria-label="Heirloom home"
          onClick={() => setOpen(false)}
        >
          <Brand />
        </Link>
        <span className="beta">EARLY PREVIEW</span>
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          <Link to="/" hash="how-it-works" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link
            className={path === "/docs" ? "active" : ""}
            to="/docs"
            onClick={() => setOpen(false)}
          >
            Docs
          </Link>
          <Link to="/roadmap" onClick={() => setOpen(false)}>
            Roadmap
          </Link>
          <Link className="nav-app" to="/app" onClick={() => setOpen(false)}>
            Open app <ArrowUpRight size={15} />
          </Link>
          <div className="hidden sm:inline-block">
            <ConnectButton />
          </div>
        </nav>
        <div className="sm:hidden mr-2">
          <ConnectButton />
        </div>
        <button
          className="menu-toggle icon-button"
          aria-label={open ? "Close menu" : "Open menu"}
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
  const [showTgModal, setShowTgModal] = useState(false);

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <Link to="/" aria-label="Heirloom home">
            <Brand />
          </Link>
          <div>
            <Link to="/docs">Documentation</Link>
            <Link to="/roadmap">Roadmap</Link>
            <a
              href="https://x.com/heirloomrh"
              target="_blank"
              rel="noopener noreferrer"
              title="Heirloom on X"
            >
              Twitter / X
            </a>
            <button
              type="button"
              onClick={() => setShowTgModal(true)}
              className="footer-link-button"
              title="Telegram Community"
            >
              Telegram
            </button>
            <Link to="/docs" hash="boundaries">Risks & boundaries</Link>
          </div>
          <Link to="/create">
            Build your legacy <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Contract Address Section */}
        <div className="footer-ca-wrap">
          <ContractAddressBadge theme="dark" />
        </div>

        <div className="footer-word" aria-hidden="true">
          <Mark />
          <span>heirloom</span>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Heirloom</span>
          <span>Made for what comes next.</span>
          <span>Designed for Robinhood Chain ↗</span>
        </div>
        <p className="fine-print">
          Frontend preview. No funds are deposited or managed here. Heirloom
          describes programmable vaults, not a statutory legal trust. Stock
          Tokens are tokenised debt securities; access is subject to eligibility
          and jurisdiction. Capital is at risk.
        </p>
      </div>

      {/* Telegram Coming Soon Modal */}
      {showTgModal && (
        <Dialog title="Community Launching Soon" onClose={() => setShowTgModal(false)}>
          <div className="dialog-body">
            <div className="flex items-start gap-3.5">
              <div className="success-badge" style={{ background: "#e0eef8", color: "#1f6a9c" }}>
                <MessageCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-lg font-semibold text-[#152a3b] mb-1">
                  Telegram Community Launching Soon
                </h4>
                <p className="text-xs leading-relaxed text-[#6a5e4d] mb-3">
                  The official Heirloom Telegram community is currently being finalized for protocol launch.
                </p>
                <p className="field-hint text-[11px] text-[#8a7c68]">
                  Official invite links will be released first on our X account:{" "}
                  <a
                    href="https://x.com/heirloomrh"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#24638f", fontWeight: 600, textDecoration: "underline" }}
                  >
                    @heirloomrh
                  </a>
                </p>
              </div>
            </div>
            <div className="dialog-actions mt-5">
              <button className="button primary" onClick={() => setShowTgModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </footer>
  );
}
