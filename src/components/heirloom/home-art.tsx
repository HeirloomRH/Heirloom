import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Plus, Minus } from "lucide-react";
import { useT } from "@/lib/i18n";

export function VaultIllustration() {
  const t = useT();
  const art = t.home.vaultArt;
  return (
    <div className="vault-illustration">
      <div className="spread">
        <span>
          <span className="avatar">E</span> {art.name}
        </span>
        <span className="soft-badge">
          <span className="status-dot" /> {art.scheduled}
        </span>
      </div>
      <span className="micro">{art.micro}</span>
      <div className="vault-amount">
        $25,000<span>.00</span>
      </div>
      <div className="spread small">
        <span>{art.valueNote}</span>
        <span>{art.assets}</span>
      </div>
      <div className="allocation-line">
        <span />
        <span />
        <span />
      </div>
      <div className="timeline">
        {art.milestones.map((m) => (
          <div key={m.label}>
            <i />
            <b>{m.label}</b>
            <span>{m.share}</span>
          </div>
        ))}
      </div>
      <Link to="/vault" search={{ id: "sample" }}>
        {art.openSample} <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

export function HomeFAQ() {
  const t = useT();
  const [active, setActive] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {t.home.faq.map((item, i) => (
        <div className="faq-item" key={item.q}>
          <button
            aria-expanded={active === i}
            aria-controls={"faq-" + i}
            onClick={() => setActive(active === i ? null : i)}
          >
            {item.q}
            {active === i ? <Minus size={17} /> : <Plus size={17} />}
          </button>
          <div id={"faq-" + i} hidden={active !== i}>
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
