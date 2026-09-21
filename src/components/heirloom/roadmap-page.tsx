import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Sprout,
  ShieldCheck,
  Layers,
  LockKeyhole,
} from "lucide-react";
import { useT } from "@/lib/i18n";

// Structure and iconography stay in code; every string comes from the dictionary.
const phases = [
  { n: "H1", key: "h1", icon: Sprout, tag: "frontendPreview" },
  { n: "H2", key: "h2", icon: ShieldCheck, tag: "planned" },
  { n: "H3", key: "h3", icon: Layers, tag: "planned" },
  { n: "H4", key: "h4", icon: LockKeyhole, tag: "research" },
] as const;

export default function Page() {
  const t = useT();
  return (
    <main id="main" className="shell roadmap-page">
      <div className="docs-hero">
        <p className="eyebrow">{t.roadmap.eyebrow}</p>
        <h1 className="product-title">
          {t.roadmap.titleLine1}
          <br />
          {t.roadmap.titleLine2}
        </h1>
        <p>{t.roadmap.subtitle}</p>
      </div>
      <div className="roadmap-intro">
        <p>{t.roadmap.introLead}</p>
        <span>
          {t.roadmap.introNoteLine1}
          <br />
          {t.roadmap.introNoteLine2}
        </span>
      </div>
      <div className="roadmap-phases">
        {phases.map((p) => {
          const copy = t.roadmap.phases[p.key];
          return (
            <article key={p.n}>
              <div className="phase-number">
                {p.n}
                <span>{t.roadmap.tags[p.tag]}</span>
              </div>
              <div>
                <p.icon size={26} />
                <h2>{copy.title}</h2>
                <p>{copy.description}</p>
                <ul>
                  {copy.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <p className="phase-note">{copy.note}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="roadmap-end">
        <h2>
          {t.roadmap.endTitleLine1}
          <br />
          {t.roadmap.endTitleLine2}
        </h2>
        <Link className="button primary" to="/create">
          {t.roadmap.endCta} <ArrowUpRight size={15} />
        </Link>
      </div>
    </main>
  );
}
