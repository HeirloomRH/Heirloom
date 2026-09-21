import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  LockKeyhole,
  Cpu,
  ArrowRight,
  Download,
  Copy,
  Check,
  Zap,
  Globe,
  RefreshCw,
  Bell,
  Scale,
  FileCode2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { Rich } from "@/lib/i18n/rich-text";

// Section ids are anchors and must not change with locale.
const SECTION_IDS = [
  "abstract",
  "problem",
  "architecture",
  "heartbeat",
  "cross-chain",
  "stealth",
  "encryption",
  "guardians",
  "formal-spec",
  "tokenomics",
  "security",
] as const;

// Diagrams and equations are notation, not prose — identical in every locale.
const VAULT_DIAGRAM = `+-----------------------------------------------------------------------------+
|                          HEIRLOOM FACTORY CONTRACT                          |
|                     (Robinhood Chain - Non-Custodial)                       |
+-----------------------------------------------------------------------------+
                                       |
                   CREATE2(salt = hash(creator, saltKey))
                                       v
+-----------------------------------------------------------------------------+
|                    ISOLATED HEIRLOOM SOVEREIGN VAULT                        |
|                                                                             |
|  [Settlor Wallet]  <--->  [Vitality State Machine]  <--->  [Beneficiary]     |
|          |                         |                             |          |
|          v                         v                             v          |
|  +---------------+        +------------------+         +-----------------+  |
|  | Basket Assets |        | Inactivity Clock |         | Scheduled Tranch|  |
|  | SPCX, AAPL,   |        |  (Heartbeats)    |         | 25% / 25% / 50% |  |
|  | NVDA, USDG    |        |        +         |         | (Vesting Cliffs)|  |
|  +---------------+        |  28-Day Grace    |         +-----------------+  |
|                           +------------------+                              |
+-----------------------------------------------------------------------------+`;

const VITALITY_STRUCT = `struct VitalityProof {
    address vaultAddress;
    uint256 nonce;
    uint256 timestamp;
    string statement; // "I confirm ongoing vitality and sovereign control over Heirloom Vault"
}`;

const STATE_MACHINE = `State(t) = {
    ACTIVE:          t < T_last + Δ_cadence
    GRACE_PERIOD:    T_last + Δ_cadence <= t < T_last + Δ_cadence + τ_grace
    MATURED:         t >= T_last + Δ_cadence + τ_grace
}`;

const TRANCHE_EQ = `Amount_released(t, k) = TotalBalance * ( TranchePercentage_k / 100 )   for t >= ReleaseDate_k`;

export default function WhitepaperPage() {
  const t = useT();
  const wp = t.whitepaper;
  const [activeSection, setActiveSection] = useState<string>("abstract");
  const [copied, setCopied] = useState(false);

  const sections = [
    { id: "abstract", title: wp.sections.abstract },
    { id: "problem", title: wp.sections.problem },
    { id: "architecture", title: wp.sections.architecture },
    { id: "heartbeat", title: wp.sections.heartbeat },
    { id: "cross-chain", title: wp.sections.crossChain },
    { id: "stealth", title: wp.sections.stealth },
    { id: "encryption", title: wp.sections.encryption },
    { id: "guardians", title: wp.sections.guardians },
    { id: "formal-spec", title: wp.sections.formalSpec },
    { id: "tokenomics", title: wp.sections.tokenomics },
    { id: "security", title: wp.sections.security },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCopyCitation = () => {
    // The citation is an academic reference and stays in English by convention.
    const citation = `Heirloom Protocol Research Group. (2026). "Heirloom: A Sovereign, Programmable Inheritance Protocol for Tokenized Equities and Real-World Assets on Robinhood Chain." Heirloom Technical Specification v1.2. https://heirloom.finance/whitepaper`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main id="main" className="shell whitepaper-page">
      {/* Meta Header */}
      <header className="whitepaper-meta-header">
        <div className="whitepaper-badges">
          <span className="wp-badge primary">{wp.badges.primary}</span>
          <span className="wp-badge">{wp.badges.version}</span>
          <span className="wp-badge accent">{wp.badges.chain}</span>
          <span className="wp-badge">{wp.badges.status}</span>
        </div>

        <h1 className="whitepaper-title">{wp.title}</h1>

        <p className="whitepaper-subtitle">{wp.subtitle}</p>

        <div className="whitepaper-authors">
          <div className="whitepaper-authors-list">
            <span>
              <strong>{wp.authorLabel}</strong> {wp.authorValue}
            </span>
            <span>
              <strong>{wp.ecosystemLabel}</strong> {wp.ecosystemValue}
            </span>
            <span>
              <strong>{wp.publishedLabel}</strong> {wp.publishedValue}
            </span>
          </div>

          <div className="whitepaper-actions">
            <button
              type="button"
              className="wp-action-btn"
              onClick={handleCopyCitation}
              title={wp.citeTitle}
            >
              {copied ? (
                <Check size={14} className="text-green-600" />
              ) : (
                <Copy size={14} />
              )}
              <span>{copied ? wp.citeCopied : wp.cite}</span>
            </button>
            <button
              type="button"
              className="wp-action-btn"
              onClick={handlePrint}
              title={wp.printTitle}
            >
              <Download size={14} />
              <span>{wp.print}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sticky TOC + Document Body */}
      <div className="whitepaper-layout">
        {/* Table of Contents Sidebar */}
        <aside className="whitepaper-toc" aria-label={wp.tocAriaLabel}>
          <p className="toc-heading">{wp.tocHeading}</p>
          <ul className="toc-list">
            {sections.map((sec) => (
              <li key={sec.id} className="toc-item">
                <a
                  href={`#${sec.id}`}
                  className={activeSection === sec.id ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(sec.id)
                      ?.scrollIntoView({ behavior: "smooth" });
                    setActiveSection(sec.id);
                  }}
                >
                  {sec.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Document Body */}
        <article className="whitepaper-content">
          {/* Abstract Box */}
          <section id="abstract" className="abstract-box">
            <h2 className="abstract-title">{wp.abstract.heading}</h2>
            <p className="abstract-text">{wp.abstract.p1}</p>
            <p className="abstract-text" style={{ marginTop: "12px" }}>
              <Rich text={wp.abstract.p2} />
            </p>
          </section>

          {/* Section 1: Problem */}
          <section id="problem" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(1)}</p>
            <h2 className="wp-section-title">{wp.problem.title}</h2>

            <p className="wp-paragraph">{wp.problem.p1}</p>
            <p className="wp-paragraph">{wp.problem.p2}</p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title">
                  <Scale size={16} /> {wp.problem.card1Title}
                </h3>
                <p className="wp-card-text">{wp.problem.card1Text}</p>
              </div>
              <div className="wp-card">
                <h3 className="wp-card-title">
                  <LockKeyhole size={16} /> {wp.problem.card2Title}
                </h3>
                <p className="wp-card-text">{wp.problem.card2Text}</p>
              </div>
              <div className="wp-card">
                <h3 className="wp-card-title">
                  <Cpu size={16} /> {wp.problem.card3Title}
                </h3>
                <p className="wp-card-text">{wp.problem.card3Text}</p>
              </div>
            </div>

            <p className="wp-paragraph">
              <Rich text={wp.problem.p3} />
            </p>
          </section>

          {/* Section 2: Vault Architecture */}
          <section id="architecture" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(2)}</p>
            <h2 className="wp-section-title">{wp.architecture.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.architecture.p1} />
            </p>

            <div className="wp-diagram">{VAULT_DIAGRAM}</div>

            <h3 className="wp-subsection-title">{wp.architecture.sub1}</h3>
            <p className="wp-paragraph">{wp.architecture.p2}</p>

            <div className="wp-math">
              VaultAddress = keccak256( 0xff ++ FactoryAddress ++
              keccak256(CreatorAddress ++ SaltNonce) ++ keccak256(Bytecode)
              )[12..31]
              <div className="wp-math-caption">
                {wp.architecture.eq1Caption}
              </div>
            </div>

            <p className="wp-paragraph">{wp.architecture.p3}</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#463d33] mb-4">
              <li>
                <Rich text={wp.architecture.bullet1} />
              </li>
              <li>
                <Rich text={wp.architecture.bullet2} />
              </li>
              <li>
                <Rich text={wp.architecture.bullet3} />
              </li>
            </ul>

            <h3 className="wp-subsection-title">{wp.architecture.sub2}</h3>
            <p className="wp-paragraph">{wp.architecture.p4}</p>
            <div className="wp-table-wrap">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>{wp.architecture.tableHead.dimension}</th>
                    <th>{wp.architecture.tableHead.revocable}</th>
                    <th>{wp.architecture.tableHead.irrevocable}</th>
                  </tr>
                </thead>
                <tbody>
                  {wp.architecture.rows.map((row) => (
                    <tr key={row.dimension}>
                      <td>
                        <strong>{row.dimension}</strong>
                      </td>
                      <td>{row.revocable}</td>
                      <td>{row.irrevocable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Vitality Heartbeat & 28-Day Grace Period */}
          <section id="heartbeat" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(3)}</p>
            <h2 className="wp-section-title">{wp.heartbeat.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.heartbeat.p1} />
            </p>

            <div className="wp-callout highlight">
              <div className="wp-callout-header">
                <Zap size={16} className="text-[#1f6a9c]" />
                <span>{wp.heartbeat.calloutTitle}</span>
              </div>
              <p className="wp-callout-text">
                <Rich text={wp.heartbeat.calloutText} />
              </p>
            </div>

            <h3 className="wp-subsection-title">{wp.heartbeat.sub1}</h3>
            <p className="wp-paragraph">{wp.heartbeat.p2}</p>

            <div className="wp-diagram">{VITALITY_STRUCT}</div>

            <p className="wp-paragraph">
              <Rich text={wp.heartbeat.p3} />
            </p>
          </section>

          {/* Section 4: Cross-Chain Gateways */}
          <section id="cross-chain" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(4)}</p>
            <h2 className="wp-section-title">{wp.crossChain.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.crossChain.p1} />
            </p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title">
                  <Globe size={16} /> {wp.crossChain.card1Title}
                </h3>
                <p className="wp-card-text">
                  <Rich text={wp.crossChain.card1Text} />
                </p>
              </div>

              <div className="wp-card">
                <h3 className="wp-card-title">
                  <RefreshCw size={16} /> {wp.crossChain.card2Title}
                </h3>
                <p className="wp-card-text">
                  <Rich text={wp.crossChain.card2Text} />
                </p>
              </div>
            </div>

            <p className="wp-paragraph">
              <Rich text={wp.crossChain.p2} />
            </p>
          </section>

          {/* Section 5: Stealth Deposits */}
          <section id="stealth" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(5)}</p>
            <h2 className="wp-section-title">{wp.stealth.title}</h2>

            <p className="wp-paragraph">{wp.stealth.p1}</p>

            <p className="wp-paragraph">
              <Rich text={wp.stealth.p2} />
            </p>

            <div className="wp-math">
              P_stealth = P_spend + keccak256(r * K_view) * G
              <div className="wp-math-caption">{wp.stealth.eq2Caption}</div>
            </div>

            <p className="wp-paragraph">{wp.stealth.p3}</p>
          </section>

          {/* Section 6: ECIES Letter Encryption */}
          <section id="encryption" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(6)}</p>
            <h2 className="wp-section-title">{wp.encryption.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.encryption.p1} />
            </p>

            <div className="wp-callout">
              <div className="wp-callout-header">
                <FileCode2 size={16} />
                <span>{wp.encryption.calloutTitle}</span>
              </div>
              <p className="wp-callout-text">
                <Rich text={wp.encryption.calloutText} />
              </p>
            </div>
          </section>

          {/* Section 7: Guardians */}
          <section id="guardians" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(7)}</p>
            <h2 className="wp-section-title">{wp.guardians.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.guardians.p1} />
            </p>

            <ul className="list-disc pl-5 space-y-2 text-sm text-[#463d33] mb-4">
              <li>
                <Rich text={wp.guardians.bullet1} />
              </li>
              <li>
                <Rich text={wp.guardians.bullet2} />
              </li>
              <li>
                <Rich text={wp.guardians.bullet3} />
              </li>
            </ul>
          </section>

          {/* Section 8: Formal State Transitions & Math */}
          <section id="formal-spec" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(8)}</p>
            <h2 className="wp-section-title">{wp.formalSpec.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.formalSpec.p1} />
            </p>

            <div className="wp-math">
              {STATE_MACHINE}
              <div className="wp-math-caption">{wp.formalSpec.eq3Caption}</div>
            </div>

            <p className="wp-paragraph">
              <Rich text={wp.formalSpec.p2} />
            </p>

            <div className="wp-math">
              {TRANCHE_EQ}
              <div className="wp-math-caption">{wp.formalSpec.eq4Caption}</div>
            </div>
          </section>

          {/* Section 9: Tokenomics & $HEIR */}
          <section id="tokenomics" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(9)}</p>
            <h2 className="wp-section-title">{wp.tokenomics.title}</h2>

            <p className="wp-paragraph">
              <Rich text={wp.tokenomics.p1} />
            </p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title">
                  <Bell size={16} /> {wp.tokenomics.card1Title}
                </h3>
                <p className="wp-card-text">{wp.tokenomics.card1Text}</p>
              </div>

              <div className="wp-card">
                <h3 className="wp-card-title">
                  <ShieldCheck size={16} /> {wp.tokenomics.card2Title}
                </h3>
                <p className="wp-card-text">{wp.tokenomics.card2Text}</p>
              </div>
            </div>
          </section>

          {/* Section 10: Security Model & Legal Boundaries */}
          <section id="security" className="wp-section">
            <p className="wp-section-num">{wp.sectionLabel(10)}</p>
            <h2 className="wp-section-title">{wp.security.title}</h2>

            <div className="wp-callout">
              <div className="wp-callout-header">
                <Scale size={16} />
                <span>{wp.security.calloutTitle}</span>
              </div>
              <p className="wp-callout-text">{wp.security.calloutText}</p>
            </div>

            <p className="wp-paragraph">{wp.security.p1}</p>
          </section>

          {/* Call to action footer in whitepaper */}
          <div className="mt-12 p-8 border border-[#d7cbb8] bg-[#faf7f2] rounded-lg text-center">
            <h3 className="font-serif text-2xl text-[#152a3b] mb-2">
              {wp.cta.title}
            </h3>
            <p className="text-sm text-[#615343] max-w-xl mx-auto mb-6">
              {wp.cta.body}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/create"
                className="button primary inline-flex items-center gap-2"
              >
                {wp.cta.build} <ArrowRight size={15} />
              </Link>
              <a
                href="https://t.me/heirloomportal"
                target="_blank"
                rel="noopener noreferrer"
                className="button outline inline-flex items-center gap-2"
              >
                {wp.cta.telegram}
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
