import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Sprout,
  ShieldCheck,
  Layers,
  LockKeyhole,
} from "lucide-react";
const phases = [
  {
    n: "H1",
    title: "A foundation for tomorrow.",
    tag: "FRONTEND PREVIEW",
    icon: Sprout,
    description:
      "Start with the things that matter: a portfolio, a person, and a plan.",
    items: [
      "Trust builder & portfolio allocation",
      "Vesting cliffs & release schedules",
      "Succession check-in interface",
      "Trust page & personal letter",
    ],
    note: "Interactive local demo available. Vault contracts and schedule execution remain production work.",
  },
  {
    n: "H2",
    title: "Support for life as it happens.",
    tag: "PLANNED",
    icon: ShieldCheck,
    description: "Give a long-term plan a thoughtful support system.",
    items: [
      "Monthly allowance streams",
      "Stock Token or USDG distributions",
      "Bounded guardian roles",
      "Guardian-attested milestone unlocks",
    ],
    note: "Guardian address capture is included in the demo. Allowance and attestation execution are planned.",
  },
  {
    n: "H3",
    title: "A legacy beyond one generation.",
    tag: "PLANNED",
    icon: Layers,
    description: "Let one good intention become the beginning of another.",
    items: [
      "$HEIR protocol token",
      "Premium product features",
      "Multi-generation vault chains",
      "Protocol fee mechanisms",
    ],
    note: "Token contracts, fees, premium rules, and distribution policies are not finalized or live.",
  },
  {
    n: "H4",
    title: "Privacy, with proof of provision.",
    tag: "RESEARCH",
    icon: LockKeyhole,
    description: "Explore ways to preserve privacy without losing clarity.",
    items: [
      "Private vault mode",
      "Shielded portfolio research",
      "Attestation-based proofs",
      "Private beneficiary delivery",
    ],
    note: "Research direction only. No shielded balances or private proof system is implemented.",
  },
];
export default function Page() {
  return (
    <main id="main" className="shell roadmap-page">
      <div className="docs-hero">
        <p className="eyebrow">BUILT FOR THE LONG VIEW</p>
        <h1 className="product-title">
          A beginning.
          <br />
          Then, generations.
        </h1>
        <p>Our path from a first vault to a lasting legacy.</p>
      </div>
      <div className="roadmap-intro">
        <p>The vision is long-term. The work is step by step.</p>
        <span>
          Phases describe product intent.
          <br />
          They are not promised release dates.
        </span>
      </div>
      <div className="roadmap-phases">
        {phases.map((p) => (
          <article key={p.n}>
            <div className="phase-number">
              {p.n}
              <span>{p.tag}</span>
            </div>
            <div>
              <p.icon size={26} />
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <ul>
                {p.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="phase-note">{p.note}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="roadmap-end">
        <h2>
          Start with something
          <br />
          worth passing on.
        </h2>
        <Link className="button primary" to="/create">
          Explore the trust builder <ArrowUpRight size={15} />
        </Link>
      </div>
    </main>
  );
}
