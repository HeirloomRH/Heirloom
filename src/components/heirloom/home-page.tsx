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
  Check,
  Plus,
} from "lucide-react";
import { Mark } from "./chrome";
import { VaultIllustration } from "./home-art";
import { ReferenceHero } from "./reference-hero";
import {
  ReferenceMotion,
  ReferenceNetwork,
  HeroHeading,
} from "./reference-motion";
export default function Home() {
  return (
    <ReferenceMotion>
      <section className="hero shell">
        <div className="hero-copy">
          <HeroHeading />
          <div className="hero-intro">
            <p>
              Bring your portfolio, your people, and your wishes together. Build
              a future they can grow into.
            </p>
            <Link className="button" to="/create">
              Create a trust <ArrowUpRight size={15} />
            </Link>
            <Link className="hero-sample" to="/vault" search={{ id: "sample" }}>
              Explore the sample workspace ↗
            </Link>
          </div>
        </div>
        <ReferenceHero />
      </section>
      <ReferenceNetwork />
      <section className="dark-section">
        <div className="shell">
          <div className="split-statement">
            <h2>
              <ShieldCheck /> Your wishes.
              <br />
              The source of truth.
            </h2>
            <div>
              <p>
                Keep the portfolio, the people, and the plan in one clear view.
                Set the rules today, so the people you love can understand
                tomorrow.
              </p>
              <Link className="text-link light" to="/docs" hash="vaults">
                Understand the vault <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="atmosphere">
            <div className="soft-orb orb-one" />
            <div className="soft-orb orb-two" />
            <p className="eyebrow">A CLEAR VIEW OF WHAT COMES NEXT</p>
            <h2>
              A legacy you can see.
              <br />A plan they can follow.
            </h2>
            <VaultIllustration />
            <p className="atmosphere-note">
              <LockKeyhole size={13} /> Illustrative vault · sample values · no
              funds held
            </p>
          </div>
          <div className="dark-note">
            <ShieldCheck size={17} />
            <p>
              <strong>Trust, made explicit.</strong> Guardian permissions are
              designed to be bounded. The production contracts must enforce
              every rule.
            </p>
            <Link to="/docs" hash="boundaries">
              Read the boundaries <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell workflow">
        <p className="eyebrow">SMALL STEPS. LASTING INTENTIONS.</p>
        <h2>From “one day” to day one.</h2>
        <div className="workflow-grid">
          <article>
            <div className="workflow-title">
              <span>01 / Create</span>
              <Sprout size={19} />
            </div>
            <p>
              A first investment in their future. Choose a portfolio and name
              the person it’s for.
            </p>
            <div className="mini-art sand">
              <div className="mini-window">
                <div className="window-label">
                  <span className="tiny-square" /> THE BEGINNING
                </div>
                <span className="mini-serif">Something to grow.</span>
                <div className="allocation-line">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="spread">
                  <span>Stock Token basket</span>
                  <span>100%</span>
                </div>
                <span className="micro">Illustrative allocation</span>
              </div>
            </div>
          </article>
          <article>
            <div className="workflow-title">
              <span>02 / Protect</span>
              <ShieldCheck size={19} />
            </div>
            <p>
              Make room for life’s milestones. Set dates, allowances, and people
              who can help.
            </p>
            <div className="mini-art sage">
              <div className="mini-window">
                <div className="window-label">
                  <span className="tiny-square" /> THE PLAN
                </div>
                {[
                  ["18th birthday", "25%"],
                  ["21st birthday", "25%"],
                  ["25th birthday", "50%"],
                ].map(([a, b]) => (
                  <div className="mini-schedule" key={a}>
                    <Clock3 size={13} />
                    <span>{a}</span>
                    <b>{b}</b>
                  </div>
                ))}
              </div>
            </div>
          </article>
          <article>
            <div className="workflow-title">
              <span>03 / Pass on</span>
              <Heart size={19} />
            </div>
            <p>
              Leave more than a portfolio. Add a letter that tells them why you
              started.
            </p>
            <div className="mini-art lavender">
              <div className="letter-paper">
                <span className="micro">A LETTER FOR YOUR TOMORROW</span>
                <p>
                  Dear Emma,
                  <br />
                  This is for the life you’ll build.
                  <br />
                  Make it wonderfully yours.
                </p>
                <span className="signature">With love, always.</span>
              </div>
            </div>
          </article>
        </div>
        <div className="capability-head">
          <h3>
            A little thought today.
            <br />A lot taken care of tomorrow.
          </h3>
          <p>One place for the details that matter.</p>
        </div>
        <div className="capability-list">
          {[
            [
              Layers,
              "Portfolio",
              "A foundation to build on",
              "Eligible Stock Tokens and ETFs, with a clear allocation.",
            ],
            [
              Clock3,
              "Vesting",
              "The right time, written in",
              "Cliffs and scheduled releases shaped around your intentions.",
            ],
            [
              Heart,
              "Heartbeat",
              "A plan that carries on",
              "Configurable check-ins for your succession instructions.",
            ],
            [
              ShieldCheck,
              "Guardians",
              "A helping hand, with limits",
              "Named oversight for pauses and milestone approvals.",
            ],
            [
              LockKeyhole,
              "Vault terms",
              "A deliberate commitment",
              "Choose revocable or irrevocable terms, with clear acknowledgement.",
            ],
            [
              Sprout,
              "A personal letter",
              "The part only you can write",
              "Give the portfolio a story, in your own words.",
            ],
          ].map(([Icon, title, tag, body]) => {
            const I = Icon as typeof Layers;
            return (
              <Link
                to="/docs"
                hash={
                  {
                    Portfolio: "portfolio",
                    Vesting: "schedules",
                    Heartbeat: "heartbeat",
                    Guardians: "guardians",
                    "Vault terms": "modes",
                    "A personal letter": "letters",
                  }[String(title)] || "vaults"
                }
                className="capability-row"
                key={String(title)}
              >
                <span>
                  <I size={17} />
                  {String(title)}
                </span>
                <span>{String(tag)}</span>
                <p>{String(body)}</p>
                <ArrowUpRight size={16} />
              </Link>
            );
          })}
        </div>
        <div className="roadmap-strip">
          <span className="eyebrow">BUILT FOR THE LONG VIEW</span>
          <p>Start with a vault. Grow into generations.</p>
          <Link className="text-link" to="/roadmap">
            Explore the roadmap <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="dashboard-section">
        <div className="shell">
          <div className="split-statement">
            <div>
              <p className="eyebrow">YOUR FAMILY’S BIGGER PICTURE</p>
              <h2>
                Everything you’re
                <br />
                building for them.
              </h2>
            </div>
            <div>
              <p>
                See your trusts, upcoming milestones, and the people at the
                heart of each one. A quiet place to keep a long-term promise.
              </p>
              <Link className="button pale" to="/app">
                Explore the app <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="dashboard-mock">
            <aside>
              <div className="mock-brand">
                <Mark /> heirloom
              </div>
              <span className="mock-nav selected">▦ &nbsp; Overview</span>
              <span className="mock-nav">▱ &nbsp; My trusts</span>
              <span className="mock-nav">♡ &nbsp; Beneficiaries</span>
              <span className="mock-nav">◷ &nbsp; Activity</span>
              <div className="mock-user">
                <span>JD</span> Your family workspace
              </div>
            </aside>
            <div className="mock-main">
              <div className="spread">
                <span className="micro">WORKSPACE / OVERVIEW</span>
                <span className="demo-label">SAMPLE WORKSPACE</span>
              </div>
              <h3>For all their tomorrows.</h3>
              <p>Good intentions, with a plan behind them.</p>
              <div className="mock-stats">
                <div>
                  <span>Portfolio value</span>
                  <b>
                    $25,000<span>.00</span>
                  </b>
                </div>
                <div>
                  <span>Trust vaults</span>
                  <b>1</b>
                </div>
                <div>
                  <span>Next milestone</span>
                  <b>
                    18th <span>birthday</span>
                  </b>
                </div>
              </div>
              <div className="mock-vault">
                <div className="spread">
                  <span>
                    <span className="avatar">E</span> Emma’s tomorrow
                  </span>
                  <span className="soft-badge">Scheduled</span>
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
                  <span>Illustrative chart · not investment performance</span>
                  <Link to="/vault" search={{ id: "sample" }}>
                    View trust <ArrowUpRight size={14} />
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
          <p className="eyebrow">SOMETHING THEY’LL CARRY FORWARD.</p>
          <h2>
            The best time to start
            <br />a legacy is today.
          </h2>
          <Link className="button primary" to="/create">
            Create your first trust <ArrowUpRight size={17} />
          </Link>
          <p className="micro">Explore the demo. Imagine the possibilities.</p>
        </div>
      </section>
    </ReferenceMotion>
  );
}
