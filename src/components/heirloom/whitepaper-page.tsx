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

export default function WhitepaperPage() {
  const [activeSection, setActiveSection] = useState("abstract");
  const [copied, setCopied] = useState(false);

  const sections = [
    { id: "abstract", title: "Abstract & Protocol Thesis" },
    { id: "problem", title: "1. The Digital Inheritance Dilemma" },
    { id: "architecture", title: "2. Deterministic Vault Architecture" },
    { id: "heartbeat", title: "3. Vitality Heartbeat & 28-Day Grace Period" },
    { id: "cross-chain", title: "4. Cross-Chain Gateways (Base & Ethereum)" },
    { id: "stealth", title: "5. Stealth Deposits & ERC-5564 Privacy" },
    { id: "encryption", title: "6. Client-Side ECIES Letter Encryption" },
    { id: "guardians", title: "7. Bounded Guardian Verification" },
    { id: "formal-spec", title: "8. Formal State Transitions & Math" },
    { id: "tokenomics", title: "9. Protocol Governance & $HEIR" },
    { id: "security", title: "10. Security Model & Legal Boundaries" },
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
      { rootMargin: "-80px 0px -60% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCopyCitation = () => {
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
          <span className="wp-badge primary">Heirloom Technical Whitepaper</span>
          <span className="wp-badge">v1.2.0 Specification</span>
          <span className="wp-badge accent">Robinhood Chain Native</span>
          <span className="wp-badge">Status: Production Specification</span>
        </div>

        <h1 className="whitepaper-title">
          Heirloom: A Sovereign, Programmable Inheritance Protocol for Tokenized Equities & Real-World Assets
        </h1>

        <p className="whitepaper-subtitle">
          Deterministic non-custodial vault isolation, cryptographic dead-man vitality verification, 
          a 28-day sovereign grace period, cross-chain deposit routing, and client-side ECIES secret conveyance on Robinhood Chain.
        </p>

        <div className="whitepaper-authors">
          <div className="whitepaper-authors-list">
            <span><strong>Author:</strong> Heirloom Protocol Research Group (@HeirloomRH)</span>
            <span><strong>Ecosystem:</strong> Robinhood Chain (EVM / Arbitrum Nitro Stack)</span>
            <span><strong>Published:</strong> 2026</span>
          </div>

          <div className="whitepaper-actions">
            <button
              type="button"
              className="wp-action-btn"
              onClick={handleCopyCitation}
              title="Copy academic citation"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              <span>{copied ? "Citation Copied" : "Cite Paper"}</span>
            </button>
            <button
              type="button"
              className="wp-action-btn"
              onClick={handlePrint}
              title="Print or Save as PDF"
            >
              <Download size={14} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sticky TOC + Document Body */}
      <div className="whitepaper-layout">
        {/* Table of Contents Sidebar */}
        <aside className="whitepaper-toc" aria-label="Table of Contents">
          <p className="toc-heading">Contents</p>
          <ul className="toc-list">
            {sections.map((sec) => (
              <li key={sec.id} className="toc-item">
                <a
                  href={`#${sec.id}`}
                  className={activeSection === sec.id ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth" });
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
            <h2 className="abstract-title">Abstract</h2>
            <p className="abstract-text">
              Digital wealth preservation and intergenerational succession represent one of the greatest unaddressed
              vectors of capital destruction in decentralized finance. Annually, billions of dollars in crypto-native
              assets and emerging tokenized real-world assets (RWAs) are permanently rendered inaccessible due to sudden
              settlor incapacitation, key loss, or the cumbersome friction of centralized probate administration.
            </p>
            <p className="abstract-text" style={{ marginTop: "12px" }}>
              <strong>Heirloom</strong> resolves this paradigm by establishing a decentralized, non-custodial trust
              primitive engineered specifically for the Robinhood Chain ecosystem. Utilizing deterministic
              CREATE2 vault isolation, EIP-712 gasless vitality heartbeats, an immutable <strong>28-day sovereign grace period</strong>,
              multi-chain deposit sweepers (Base and Ethereum L1), ERC-5564 stealth funding, and client-side ECIES letter
              encryption, Heirloom eliminates shared honeypot attack vectors while enabling automated, censorship-resistant
              wealth transfer directly into tokenized securities (SPCX, AAPL, NVDA, TSLA) and stable liquidity (USDG, ETH).
            </p>
          </section>

          {/* Section 1: Problem */}
          <section id="problem" className="wp-section">
            <p className="wp-section-num">Section 1</p>
            <h2 className="wp-section-title">The Digital Inheritance Dilemma</h2>
            
            <p className="wp-paragraph">
              Traditional estate transfer mechanisms are fundamentally adversarial to the core ethos of self-sovereign
              ownership. When an individual manages capital within traditional brokerages or centralized exchanges, death
              triggers a grueling multi-month probate process characterized by executor fees (averaging 3% to 7% of gross
              estate value), state court delays, public exposure of asset holdings, and jurisdiction-dependent asset freezes.
            </p>

            <p className="wp-paragraph">
              Conversely, decentralized self-custody shifts the entirety of operational risk onto private key management.
              If a settlor passes away or suffers debilitating incapacitation without delivering plaintext seed phrases to
              heirs, their capital is irreversibly burned. If the settlor instead shares keys prior to death, they forfeit
              sovereign control, inviting premature theft, coercion, or irreversible accidental liquidation.
            </p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title"><Scale size={16} /> Centralized Custody</h3>
                <p className="wp-card-text">
                  Frozen accounts, burdensome legal probate, 3–7% administrative dissipation, public court records, and months of delay before heir liquidity.
                </p>
              </div>
              <div className="wp-card">
                <h3 className="wp-card-title"><LockKeyhole size={16} /> Naive Key Sharing</h3>
                <p className="wp-card-text">
                  Pre-mortem loss of autonomy, exposure to compromised beneficiary devices, social engineering threats, and zero programmatic vesting controls.
                </p>
              </div>
              <div className="wp-card">
                <h3 className="wp-card-title"><Cpu size={16} /> Shared Pool Honeypots</h3>
                <p className="wp-card-text">
                  Early smart-contract inheritance protocols co-mingled deposits into monolithic pools, creating multi-million-dollar targets for reentrancy and flash-loan exploits.
                </p>
              </div>
            </div>

            <p className="wp-paragraph">
              The advent of <strong>Robinhood Chain</strong>—providing institutional-grade tokenized securities (Stock Tokens)
              and sub-cent transaction settlement—demands an inheritance architecture engineered with mathematical rigor,
              isolated custody, and strict boundaries.
            </p>
          </section>

          {/* Section 2: Vault Architecture */}
          <section id="architecture" className="wp-section">
            <p className="wp-section-num">Section 2</p>
            <h2 className="wp-section-title">Deterministic Vault Architecture</h2>

            <p className="wp-paragraph">
              Heirloom rejects the monolithic vault paradigm. Rather than pooling user capital into a shared contract,
              Heirloom deploys an independent, deterministic contract instance for each settlor-beneficiary pair using
              the EVM <code>CREATE2</code> opcode.
            </p>

            <div className="wp-diagram">
{`+-----------------------------------------------------------------------------+
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
+-----------------------------------------------------------------------------+`}
            </div>

            <h3 className="wp-subsection-title">2.1 CREATE2 Address Derivation</h3>
            <p className="wp-paragraph">
              Vault addresses are calculated counterfactually prior to deployment:
            </p>

            <div className="wp-math">
              VaultAddress = keccak256( 0xff ++ FactoryAddress ++ keccak256(CreatorAddress ++ SaltNonce) ++ keccak256(Bytecode) )[12..31]
              <div className="wp-math-caption">Equation 1: Deterministic CREATE2 derivation ensuring non-colliding isolated storage slots.</div>
            </div>

            <p className="wp-paragraph">
              This isolation guarantees that:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#463d33] mb-4">
              <li><strong>Zero Cross-Contamination:</strong> A flaw or edge case in one vault cannot access or manipulate the state of another vault.</li>
              <li><strong>Zero Admin Keys:</strong> The Heirloom protocol maintainers hold no backdoors, upgrade proxies, or discretionary withdrawal authority over individual vaults.</li>
              <li><strong>Direct Token Custody:</strong> Tokenized equities (Stock Tokens) and stablecoins reside directly within the vault's individual contract address.</li>
            </ul>

            <h3 className="wp-subsection-title">2.2 Trust Modes: Revocable vs. Irrevocable</h3>
            <p className="wp-paragraph">
              Creators select between two irrevocable governance modes upon sealing:
            </p>
            <div className="wp-table-wrap">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th>Revocable Trust Vault</th>
                    <th>Irrevocable Covenant Vault</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Settlor Recall</strong></td>
                    <td>Allowed at any moment prior to settlement</td>
                    <td>Immutable; settlor cannot reclaim capital once sealed</td>
                  </tr>
                  <tr>
                    <td><strong>Creditor Isolation</strong></td>
                    <td>Standard self-custody asset protection</td>
                    <td>Strict temporal asset lock; immune to coercion</td>
                  </tr>
                  <tr>
                    <td><strong>Parameter Modification</strong></td>
                    <td>Schedule, beneficiary, and basket rebalancing enabled</td>
                    <td>Locked; requires guardian attestation if configured</td>
                  </tr>
                  <tr>
                    <td><strong>Beneficiary Certainty</strong></td>
                    <td>Subject to settlor modification during lifetime</td>
                    <td>Absolute cryptographic guarantee of delivery</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Vitality Heartbeat & 28-Day Grace Period */}
          <section id="heartbeat" className="wp-section">
            <p className="wp-section-num">Section 3</p>
            <h2 className="wp-section-title">Vitality Heartbeat & The 28-Day Sovereign Grace Period</h2>

            <p className="wp-paragraph">
              The cornerstone of automated succession is the <strong>Vitality Engine</strong>. Traditional dead-man
              switches suffer from premature firing: an owner travels without internet access, falls ill briefly, or simply
              forgets to log in, resulting in catastrophic accidental liquidation of their wealth to beneficiaries.
            </p>

            <div className="wp-callout highlight">
              <div className="wp-callout-header">
                <Zap size={16} className="text-[#1f6a9c]" />
                <span>The 28-Day Sovereign Escalation Window</span>
              </div>
              <p className="wp-callout-text">
                Heirloom enforces a mandatory <strong>28-day Sovereign Grace Period</strong> whenever a creator's standard
                vitality window lapses. The vault does NOT transfer assets immediately upon a missed cadence. Instead, an
                autonomous high-priority escalation period triggers multi-channel alerts (including the official 
                <a href="https://t.me/heirloomportal" target="_blank" rel="noopener noreferrer" className="font-semibold underline ml-1">@HeirloomRHBot</a> Telegram assistant).
                A single off-chain EIP-712 vitality signature during these 28 days instantly restores the vault to healthy active status.
              </p>
            </div>

            <h3 className="wp-subsection-title">3.1 Gasless EIP-712 Check-Ins</h3>
            <p className="wp-paragraph">
              Owners are never required to spend gas to prove they are alive. The owner signs an EIP-712 typed data
              structure within their wallet (hardware device, mobile passkey, or browser):
            </p>

            <div className="wp-diagram">
{`struct VitalityProof {
    address vaultAddress;
    uint256 nonce;
    uint256 timestamp;
    string statement; // "I confirm ongoing vitality and sovereign control over Heirloom Vault"
}`}
            </div>

            <p className="wp-paragraph">
              This signature is broadcasted to the decentralized Heirloom Relayer network. Relayers verify the ECDSA
              signature against the vault's registered <code>creator</code> address and submit the vitality update on-chain,
              subsidized by the vault's micro-reserve or the protocol fee engine.
            </p>
          </section>

          {/* Section 4: Cross-Chain Gateways */}
          <section id="cross-chain" className="wp-section">
            <p className="wp-section-num">Section 4</p>
            <h2 className="wp-section-title">Universal Cross-Chain Deposit Gateways</h2>

            <p className="wp-paragraph">
              While Heirloom vaults settle natively on Robinhood Chain, capital is dispersed across fragmented ecosystems.
              To maximize liquidity and eliminate user friction, Heirloom introduces deterministic 
              <strong>Universal Ingestion Gateways</strong> for Base and Ethereum Mainnet.
            </p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title"><Globe size={16} /> Base Ingestion Gateway</h3>
                <p className="wp-card-text">
                  Users receive a dedicated Base deposit address. Inbound transfers of native <strong>ETH</strong> or 
                  <strong>USDC</strong> are automatically swept via atomic bridging to Robinhood Chain and split into the
                  vault's asset basket.
                </p>
              </div>

              <div className="wp-card">
                <h3 className="wp-card-title"><RefreshCw size={16} /> Ethereum L1 Gateway</h3>
                <p className="wp-card-text">
                  High-value institutional deposits on Ethereum Mainnet supporting <strong>ETH</strong>, <strong>USDT</strong>,
                  and <strong>USDC</strong>. Batched settlement minimizes L1 gas overhead while funding Robinhood Chain vaults seamlessly.
                </p>
              </div>
            </div>

            <p className="wp-paragraph">
              Crucially, cross-chain deposit routing operates for <strong>any vault</strong>—whether newly initialized or
              active for decades. Third-party donors, family offices, or employers can fund a vault simply by sending assets
              to the multi-chain route identifier without interacting with Robinhood Chain directly.
            </p>
          </section>

          {/* Section 5: Stealth Deposits */}
          <section id="stealth" className="wp-section">
            <p className="wp-section-num">Section 5</p>
            <h2 className="wp-section-title">Stealth Vaults & ERC-5564 Privacy Relayers</h2>

            <p className="wp-paragraph">
              Public blockchains create severe privacy vulnerabilities for wealth transfer: if a parent transfers $500,000
              in tokenized equity to their child's known public wallet, blockchain surveillance engines immediately link both
              parties and expose the beneficiary's net worth to malicious actors, phishing cartels, and targeted exploits.
            </p>

            <p className="wp-paragraph">
              Heirloom implements <strong>ERC-5564 Stealth Meta-Addresses</strong>. Beneficiaries publish a single reusable
              stealth meta-address consisting of a spending key and a viewing key:
            </p>

            <div className="wp-math">
              P_stealth = P_spend + keccak256(r * K_view) * G
              <div className="wp-math-caption">Equation 2: Non-interactive stealth key generation (Diffie-Hellman on secp256k1).</div>
            </div>

            <p className="wp-paragraph">
              When the vault matures and assets vest, distributions are routed into ephemeral, one-time stealth addresses.
              Only the beneficiary—possessing the private spending key—can discover and unlock the funds. An on-chain observer
              cannot correlate the vault distributions with the beneficiary's public identity.
            </p>
          </section>

          {/* Section 6: ECIES Letter Encryption */}
          <section id="encryption" className="wp-section">
            <p className="wp-section-num">Section 6</p>
            <h2 className="wp-section-title">Client-Side ECIES Letter Encryption</h2>

            <p className="wp-paragraph">
              Inheritance is deeply personal. A financial trust devoid of guidance, values, and emotional context is incomplete.
              Heirloom incorporates the <strong>Personal Letter Conveyance</strong> protocol.
            </p>

            <div className="wp-callout">
              <div className="wp-callout-header">
                <FileCode2 size={16} />
                <span>Zero-Knowledge Secret Delivery</span>
              </div>
              <p className="wp-callout-text">
                Letters are never stored in plaintext on-chain or in centralized databases. In the client browser, the text
                is encrypted using <strong>ECIES</strong> (Elliptic Curve Integrated Encryption Scheme) with AES-256-GCM,
                keyed directly to the beneficiary's public key. The ciphertext is anchored to decentralized storage (IPFS/Arweave).
                Only when the vault state machine achieves <code>Matured</code> status does the decryption payload verify against
                the beneficiary's cryptographic signature.
              </p>
            </div>
          </section>

          {/* Section 7: Guardians */}
          <section id="guardians" className="wp-section">
            <p className="wp-section-num">Section 7</p>
            <h2 className="wp-section-title">Bounded Guardian Verification & Negative Permissions</h2>

            <p className="wp-paragraph">
              Traditional executors wield absolute unilateral authority over estate assets, creating rampant opportunities
              for self-dealing and embezzlement. Heirloom introduces <strong>Bounded Guardians</strong> governed by strict
              negative permissions:
            </p>

            <ul className="list-disc pl-5 space-y-2 text-sm text-[#463d33] mb-4">
              <li><strong>Emergency Dispute Pause:</strong> A guardian can trigger a single 14-day pause if they detect an active fraud vector or coercion.</li>
              <li><strong>Milestone Attestation:</strong> In milestone-conditional trusts (e.g., beneficiary attaining age 25 or completing higher education), guardians attest completion via digital signature.</li>
              <li><strong>Absolute Inability to Divert:</strong> Under NO circumstances can a guardian change the beneficiary address, withdraw capital to their own address, or alter the portfolio allocations.</li>
            </ul>
          </section>

          {/* Section 8: Formal State Transitions & Math */}
          <section id="formal-spec" className="wp-section">
            <p className="wp-section-num">Section 8</p>
            <h2 className="wp-section-title">Formal State Transitions & Mathematics</h2>

            <p className="wp-paragraph">
              The lifecycle of an Heirloom vault represents a deterministic finite-state machine (FSM). Let{" "}
              <code>T_last</code> be the timestamp of the last recorded vitality heartbeat,{" "}
              <code>Δ_cadence</code> be the agreed check-in interval, and{" "}
              <code>{"τ_grace = 28 days = 2,419,200 seconds"}</code>.
            </p>

            <div className="wp-math">
{`State(t) = {
    ACTIVE:          t < T_last + Δ_cadence
    GRACE_PERIOD:    T_last + Δ_cadence <= t < T_last + Δ_cadence + τ_grace
    MATURED:         t >= T_last + Δ_cadence + τ_grace
}`}
              <div className="wp-math-caption">Equation 3: Discrete state transition boundaries of the Vitality Engine.</div>
            </div>

            <p className="wp-paragraph">
              Upon reaching <code>MATURED</code>, assets disburse according to the creator's tranche schedule:
            </p>

            <div className="wp-math">
{`Amount_released(t, k) = TotalBalance * ( TranchePercentage_k / 100 )   for t >= ReleaseDate_k`}
              <div className="wp-math-caption">{"Equation 4: Deterministic asset tranche allocation. Σ(TranchePercentage) = 100%."}</div>
            </div>
          </section>

          {/* Section 9: Tokenomics & $HEIR */}
          <section id="tokenomics" className="wp-section">
            <p className="wp-section-num">Section 9</p>
            <h2 className="wp-section-title">Protocol Governance & The $HEIR Ecosystem</h2>

            <p className="wp-paragraph">
              The <strong>$HEIR</strong> protocol token aligns incentives among settlors, beneficiaries, automated keepers,
              and security researchers:
            </p>

            <div className="wp-grid">
              <div className="wp-card">
                <h3 className="wp-card-title"><Bell size={16} /> Keeper Gas Subsidies</h3>
                <p className="wp-card-text">
                  Staked $HEIR yields automated keeper fees, financing gasless heartbeats and automated cross-chain deposit sweepers perpetually.
                </p>
              </div>

              <div className="wp-card">
                <h3 className="wp-card-title"><ShieldCheck size={16} /> Asset Registry Governance</h3>
                <p className="wp-card-text">
                  Token holders vote to approve new eligible tokenized stock registries, oracle providers, and RWA collateral types on Robinhood Chain.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Security Model & Legal Boundaries */}
          <section id="security" className="wp-section">
            <p className="wp-section-num">Section 10</p>
            <h2 className="wp-section-title">Security Model, Auditing & Legal Boundaries</h2>

            <div className="wp-callout">
              <div className="wp-callout-header">
                <Scale size={16} />
                <span>Honest Legal Boundaries</span>
              </div>
              <p className="wp-callout-text">
                Heirloom describes programmable cryptographic custody rules; it is not a statutory legal trust under probate law.
                Stock Tokens are tokenized debt securities governed by Robinhood Chain's underlying terms of service and issuer
                eligibility criteria. Users are strongly advised to coordinate their on-chain vaults with professional estate
                attorneys in their respective tax jurisdictions.
              </p>
            </div>

            <p className="wp-paragraph">
              Smart contracts undergo continuous automated property-based testing and formal verification to guarantee that
              vault balances remain solvent, non-reentrant, and exclusively claimable by authenticated beneficiaries.
            </p>
          </section>

          {/* Call to action footer in whitepaper */}
          <div className="mt-12 p-8 border border-[#d7cbb8] bg-[#faf7f2] rounded-lg text-center">
            <h3 className="font-serif text-2xl text-[#152a3b] mb-2">Ready to secure your generational legacy?</h3>
            <p className="text-sm text-[#615343] max-w-xl mx-auto mb-6">
              Experience the Heirloom interactive builder on Robinhood Chain. Allocate stock tokens, establish your heartbeat schedule, and craft your sovereign vault.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/create" className="button primary inline-flex items-center gap-2">
                Build your vault <ArrowRight size={15} />
              </Link>
              <a
                href="https://t.me/heirloomportal"
                target="_blank"
                rel="noopener noreferrer"
                className="button outline inline-flex items-center gap-2"
              >
                Join Telegram Community
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
