import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Heart,
  LockKeyhole,
  Sprout,
  Clock3,
  Layers,
} from "lucide-react";
import { Mark } from "./chrome";
import { VaultIllustration } from "./home-art";
import { ReferenceHero } from "./reference-hero";
import {
  ReferenceMotion,
  ReferenceNetwork,
  HeroHeading,
} from "./reference-motion";
import { ContractAddressBadge } from "./contract-address-badge";
import { useT } from "@/lib/i18n";

// Icon + docs anchor stay in code; the copy is keyed off the dictionary so the
// deep links never depend on translated text.
const capabilities = [
  { key: "portfolio", icon: Layers, hash: "portfolio" },
  { key: "vesting", icon: Clock3, hash: "schedules" },
  { key: "heartbeat", icon: Heart, hash: "heartbeat" },
  { key: "guardians", icon: ShieldCheck, hash: "guardians" },
  { key: "terms", icon: LockKeyhole, hash: "modes" },
  { key: "letter", icon: Sprout, hash: "letters" },
] as const;

export default function Home() {
  const t = useT();
  return (
    <ReferenceMotion>
      <section className="hero shell">
        <div className="hero-copy">
          <HeroHeading />
          <div className="hero-intro">
            <p>{t.home.hero.intro}</p>
            <Link className="button" to="/create">
              {t.home.hero.createCta} <ArrowUpRight size={15} />
            </Link>
            <Link className="hero-sample" to="/vault" search={{ id: "sample" }}>
              {t.home.hero.sampleCta}
            </Link>
            <div style={{ marginTop: "18px" }}>
              <ContractAddressBadge theme="light" />
            </div>
          </div>
        </div>
        <ReferenceHero />
      </section>
      <ReferenceNetwork />
      <section className="dark-section">
        <div className="shell">
          <div className="split-statement">
            <h2>
              <ShieldCheck /> {t.home.statement.titleLine1}
              <br />
              {t.home.statement.titleLine2}
            </h2>
            <div>
              <p>{t.home.statement.body}</p>
              <Link className="text-link light" to="/docs" hash="vaults">
                {t.home.statement.cta} <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="atmosphere">
            <div className="soft-orb orb-one" />
            <div className="soft-orb orb-two" />
            <p className="eyebrow">{t.home.atmosphere.eyebrow}</p>
            <h2>
              {t.home.atmosphere.titleLine1}
              <br />
              {t.home.atmosphere.titleLine2}
            </h2>
            <VaultIllustration />
            <p className="atmosphere-note">
              <LockKeyhole size={13} /> {t.home.atmosphere.note}
            </p>
          </div>
          <div className="dark-note">
            <ShieldCheck size={17} />
            <p>
              <strong>{t.home.darkNote.lead}</strong> {t.home.darkNote.body}
            </p>
            <Link to="/docs" hash="boundaries">
              {t.home.darkNote.cta} <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell workflow">
        <p className="eyebrow">{t.home.workflow.eyebrow}</p>
        <h2>{t.home.workflow.title}</h2>
        <div className="workflow-grid">
          <article>
            <div className="workflow-title">
              <span>{t.home.workflow.steps.create.label}</span>
              <Sprout size={19} />
            </div>
            <p>{t.home.workflow.steps.create.body}</p>
            <div className="mini-art sand">
              <div className="mini-window">
                <div className="window-label">
                  <span className="tiny-square" />{" "}
                  {t.home.workflow.steps.create.artLabel}
                </div>
                <span className="mini-serif">
                  {t.home.workflow.steps.create.artTitle}
                </span>
                <div className="allocation-line">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="spread">
                  <span>{t.home.workflow.steps.create.artBasket}</span>
                  <span>100%</span>
                </div>
                <span className="micro">
                  {t.home.workflow.steps.create.artNote}
                </span>
              </div>
            </div>
          </article>
          <article>
            <div className="workflow-title">
              <span>{t.home.workflow.steps.protect.label}</span>
              <ShieldCheck size={19} />
            </div>
            <p>{t.home.workflow.steps.protect.body}</p>
            <div className="mini-art sage">
              <div className="mini-window">
                <div className="window-label">
                  <span className="tiny-square" />{" "}
                  {t.home.workflow.steps.protect.artLabel}
                </div>
                {t.home.miniSchedule.map((row) => (
                  <div className="mini-schedule" key={row.label}>
                    <Clock3 size={13} />
                    <span>{row.label}</span>
                    <b>{row.share}</b>
                  </div>
                ))}
              </div>
            </div>
          </article>
          <article>
            <div className="workflow-title">
              <span>{t.home.workflow.steps.passOn.label}</span>
              <Heart size={19} />
            </div>
            <p>{t.home.workflow.steps.passOn.body}</p>
            <div className="mini-art lavender">
              <div className="letter-paper">
                <span className="micro">
                  {t.home.workflow.steps.passOn.letterLabel}
                </span>
                <p>
                  {t.home.workflow.steps.passOn.letterLine1}
                  <br />
                  {t.home.workflow.steps.passOn.letterLine2}
                  <br />
                  {t.home.workflow.steps.passOn.letterLine3}
                </p>
                <span className="signature">
                  {t.home.workflow.steps.passOn.letterSignature}
                </span>
              </div>
            </div>
          </article>
        </div>
        <div className="capability-head">
          <h3>
            {t.home.capability.headTitleLine1}
            <br />
            {t.home.capability.headTitleLine2}
          </h3>
          <p>{t.home.capability.headBody}</p>
        </div>
        <div className="capability-list">
          {capabilities.map(({ key, icon: Icon, hash }) => {
            const row = t.home.capability.rows[key];
            return (
              <Link
                to="/docs"
                hash={hash}
                className="capability-row"
                key={key}
              >
                <span>
                  <Icon size={17} />
                  {row.title}
                </span>
                <span>{row.tag}</span>
                <p>{row.body}</p>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
        </div>
        <div className="roadmap-strip">
          <span className="eyebrow">{t.home.roadmapStrip.eyebrow}</span>
          <p>{t.home.roadmapStrip.body}</p>
          <Link className="text-link" to="/roadmap">
            {t.home.roadmapStrip.cta} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="dashboard-section">
        <div className="shell">
          <div className="split-statement">
            <div>
              <p className="eyebrow">{t.home.dashboard.eyebrow}</p>
              <h2>
                {t.home.dashboard.titleLine1}
                <br />
                {t.home.dashboard.titleLine2}
              </h2>
            </div>
            <div>
              <p>{t.home.dashboard.body}</p>
              <Link className="button pale" to="/app">
                {t.home.dashboard.cta} <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="dashboard-mock">
            <aside>
              <div className="mock-brand">
                <Mark /> {t.common.brand}
              </div>
              <span className="mock-nav selected">
                ▦ &nbsp; {t.home.dashboard.mock.overview}
              </span>
              <span className="mock-nav">
                ▱ &nbsp; {t.home.dashboard.mock.myTrusts}
              </span>
              <span className="mock-nav">
                ♡ &nbsp; {t.home.dashboard.mock.beneficiaries}
              </span>
              <span className="mock-nav">
                ◷ &nbsp; {t.home.dashboard.mock.activity}
              </span>
              <div className="mock-user">
                <span>JD</span> {t.home.dashboard.mock.workspace}
              </div>
            </aside>
            <div className="mock-main">
              <div className="spread">
                <span className="micro">
                  {t.home.dashboard.mock.breadcrumb}
                </span>
                <span className="demo-label">
                  {t.home.dashboard.mock.sampleLabel}
                </span>
              </div>
              <h3>{t.home.dashboard.mock.title}</h3>
              <p>{t.home.dashboard.mock.subtitle}</p>
              <div className="mock-stats">
                <div>
                  <span>{t.home.dashboard.mock.portfolioValue}</span>
                  <b>
                    $25,000<span>.00</span>
                  </b>
                </div>
                <div>
                  <span>{t.home.dashboard.mock.trustVaults}</span>
                  <b>1</b>
                </div>
                <div>
                  <span>{t.home.dashboard.mock.nextMilestone}</span>
                  <b>
                    {t.home.dashboard.mock.milestoneValue}{" "}
                    <span>{t.home.dashboard.mock.milestoneUnit}</span>
                  </b>
                </div>
              </div>
              <div className="mock-vault">
                <div className="spread">
                  <span>
                    <span className="avatar">E</span>{" "}
                    {t.home.dashboard.mock.vaultName}
                  </span>
                  <span className="soft-badge">
                    {t.home.dashboard.mock.scheduled}
                  </span>
                </div>
                <div className="mock-chart">
                  <svg viewBox="0 0 700 110" preserveAspectRatio="none">
                    <path
                      d="M0 98 Q50 103 100 81T200 73T300 49T400 51T500 30T600 23T700 7"
                      fill="none"
                      stroke="#a6ad87"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="spread">
                  <span>{t.home.dashboard.mock.chartNote}</span>
                  <Link to="/vault" search={{ id: "sample" }}>
                    {t.home.dashboard.mock.viewTrust}{" "}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="final-cta">
        <div className="shell">
          <span className="orange-mark">
            <Mark />
          </span>
          <p className="eyebrow">{t.home.finalCta.eyebrow}</p>
          <h2>
            {t.home.finalCta.titleLine1}
            <br />
            {t.home.finalCta.titleLine2}
          </h2>
          <Link className="button primary" to="/create">
            {t.home.finalCta.cta} <ArrowUpRight size={17} />
          </Link>
          <p className="micro">{t.home.finalCta.note}</p>
        </div>
      </section>
    </ReferenceMotion>
  );
}
