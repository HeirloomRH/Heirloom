import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, LockKeyhole, Plus, Minus, Heart } from "lucide-react";
export function VaultIllustration() {
  return (
    <div className="vault-illustration">
      <div className="spread">
        <span>
          <span className="avatar">E</span> Emma’s tomorrow
        </span>
        <span className="soft-badge">
          <span className="status-dot" /> Scheduled
        </span>
      </div>
      <span className="micro">A LITTLE HEAD START, FROM ME TO YOU.</span>
      <div className="vault-amount">
        $25,000<span>.00</span>
      </div>
      <div className="spread small">
        <span>Illustrative portfolio value</span>
        <span>3 assets</span>
      </div>
      <div className="allocation-line">
        <span />
        <span />
        <span />
      </div>
      <div className="timeline">
        <div>
          <i />
          <b>18th birthday</b>
          <span>25% of portfolio</span>
        </div>
        <div>
          <i />
          <b>21st birthday</b>
          <span>25% of portfolio</span>
        </div>
        <div>
          <i />
          <b>25th birthday</b>
          <span>50% of portfolio</span>
        </div>
      </div>
      <Link to="/vault" search={{ id: "sample" }}>
        Open sample trust <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
const faqs = [
  [
    "Is Heirloom a legal trust?",
    "Heirloom is a programmable vault concept, not a statutory legal trust. Its rules are intended to be executed by smart contracts. Appropriate legal estate planning may still be needed.",
  ],
  [
    "Can I put real assets into this preview?",
    "No. This frontend lets you build and save a demo vault in your browser. It does not connect to a deployed Heirloom vault, move funds, or execute distributions.",
  ],
  [
    "What happens if I miss a check-in?",
    "The intended succession plan activates after a configured check-in window and grace period. In this preview, check-ins only update local demo state; no transfer or automated succession occurs.",
  ],
  [
    "Can a guardian take the portfolio?",
    "The proposed guardian role can pause distributions or attest milestones. It is designed to have no power to redirect assets. Those limits must be verified in the production contracts.",
  ],
  [
    "What is $HEIR?",
    "$HEIR is a planned protocol token described in the roadmap. This frontend does not offer token purchases, staking, or a verified token contract.",
  ],
];
export function HomeFAQ() {
  const [active, setActive] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {faqs.map(([q, a], i) => (
        <div className="faq-item" key={q}>
          <button
            aria-expanded={active === i}
            aria-controls={"faq-" + i}
            onClick={() => setActive(active === i ? null : i)}
          >
            {q}
            {active === i ? <Minus size={17} /> : <Plus size={17} />}
          </button>
          <div id={"faq-" + i} hidden={active !== i}>
            <p>{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
