export const whitepaper = {
  badges: {
    primary: "Heirloom Technical Whitepaper",
    version: "v1.2.0 Specification",
    chain: "Robinhood Chain Native",
    status: "Status: Production Specification",
  },
  title:
    "Heirloom: A Sovereign, Programmable Inheritance Protocol for Tokenized Equities & Real-World Assets",
  subtitle:
    "Deterministic non-custodial vault isolation, cryptographic dead-man vitality verification, a 28-day sovereign grace period, cross-chain deposit routing, and client-side ECIES secret conveyance on Robinhood Chain.",

  authorLabel: "Author:",
  authorValue: "Heirloom Protocol Research Group (@HeirloomRH)",
  ecosystemLabel: "Ecosystem:",
  ecosystemValue: "Robinhood Chain (EVM / Arbitrum Nitro Stack)",
  publishedLabel: "Published:",
  publishedValue: "2026",

  citeTitle: "Copy academic citation",
  cite: "Cite Paper",
  citeCopied: "Citation Copied",
  printTitle: "Print or Save as PDF",
  print: "Print / PDF",

  tocAriaLabel: "Table of Contents",
  tocHeading: "Contents",
  sectionLabel: (n: number) => `Section ${n}`,

  sections: {
    abstract: "Abstract & Protocol Thesis",
    problem: "1. The Digital Inheritance Dilemma",
    architecture: "2. Deterministic Vault Architecture",
    heartbeat: "3. Vitality Heartbeat & 28-Day Grace Period",
    crossChain: "4. Cross-Chain Gateways (Base & Ethereum)",
    stealth: "5. Stealth Deposits & ERC-5564 Privacy",
    encryption: "6. Client-Side ECIES Letter Encryption",
    guardians: "7. Bounded Guardian Verification",
    formalSpec: "8. Formal State Transitions & Math",
    tokenomics: "9. Protocol Governance & $HEIR",
    security: "10. Security Model & Legal Boundaries",
  },

  abstract: {
    heading: "Abstract",
    p1: "Digital wealth preservation and intergenerational succession represent one of the greatest unaddressed vectors of capital destruction in decentralized finance. Annually, billions of dollars in crypto-native assets and emerging tokenized real-world assets (RWAs) are permanently rendered inaccessible due to sudden settlor incapacitation, key loss, or the cumbersome friction of centralized probate administration.",
    p2: "**Heirloom** resolves this paradigm by establishing a decentralized, non-custodial trust primitive engineered specifically for the Robinhood Chain ecosystem. Utilizing deterministic CREATE2 vault isolation, EIP-712 gasless vitality heartbeats, an immutable **28-day sovereign grace period**, multi-chain deposit sweepers (Base and Ethereum L1), ERC-5564 stealth funding, and client-side ECIES letter encryption, Heirloom eliminates shared honeypot attack vectors while enabling automated, censorship-resistant wealth transfer directly into tokenized securities (SPCX, AAPL, NVDA, TSLA) and stable liquidity (USDG, ETH).",
  },

  problem: {
    title: "The Digital Inheritance Dilemma",
    p1: "Traditional estate transfer mechanisms are fundamentally adversarial to the core ethos of self-sovereign ownership. When an individual manages capital within traditional brokerages or centralized exchanges, death triggers a grueling multi-month probate process characterized by executor fees (averaging 3% to 7% of gross estate value), state court delays, public exposure of asset holdings, and jurisdiction-dependent asset freezes.",
    p2: "Conversely, decentralized self-custody shifts the entirety of operational risk onto private key management. If a settlor passes away or suffers debilitating incapacitation without delivering plaintext seed phrases to heirs, their capital is irreversibly burned. If the settlor instead shares keys prior to death, they forfeit sovereign control, inviting premature theft, coercion, or irreversible accidental liquidation.",
    card1Title: "Centralized Custody",
    card1Text:
      "Frozen accounts, burdensome legal probate, 3–7% administrative dissipation, public court records, and months of delay before heir liquidity.",
    card2Title: "Naive Key Sharing",
    card2Text:
      "Pre-mortem loss of autonomy, exposure to compromised beneficiary devices, social engineering threats, and zero programmatic vesting controls.",
    card3Title: "Shared Pool Honeypots",
    card3Text:
      "Early smart-contract inheritance protocols co-mingled deposits into monolithic pools, creating multi-million-dollar targets for reentrancy and flash-loan exploits.",
    p3: "The advent of **Robinhood Chain** — providing institutional-grade tokenized securities (Stock Tokens) and sub-cent transaction settlement — demands an inheritance architecture engineered with mathematical rigor, isolated custody, and strict boundaries.",
  },

  architecture: {
    title: "Deterministic Vault Architecture",
    p1: "Heirloom rejects the monolithic vault paradigm. Rather than pooling user capital into a shared contract, Heirloom deploys an independent, deterministic contract instance for each settlor-beneficiary pair using the EVM `CREATE2` opcode.",
    sub1: "2.1 CREATE2 Address Derivation",
    p2: "Vault addresses are calculated counterfactually prior to deployment:",
    eq1Caption:
      "Equation 1: Deterministic CREATE2 derivation ensuring non-colliding isolated storage slots.",
    p3: "This isolation guarantees that:",
    bullet1:
      "**Zero Cross-Contamination:** A flaw or edge case in one vault cannot access or manipulate the state of another vault.",
    bullet2:
      "**Zero Admin Keys:** The Heirloom protocol maintainers hold no backdoors, upgrade proxies, or discretionary withdrawal authority over individual vaults.",
    bullet3:
      "**Direct Token Custody:** Tokenized equities (Stock Tokens) and stablecoins reside directly within the vault's individual contract address.",
    sub2: "2.2 Trust Modes: Revocable vs. Irrevocable",
    p4: "Creators select between two irrevocable governance modes upon sealing:",
    tableHead: {
      dimension: "Dimension",
      revocable: "Revocable Trust Vault",
      irrevocable: "Irrevocable Covenant Vault",
    },
    rows: [
      {
        dimension: "Settlor Recall",
        revocable: "Allowed at any moment prior to settlement",
        irrevocable: "Immutable; settlor cannot reclaim capital once sealed",
      },
      {
        dimension: "Creditor Isolation",
        revocable: "Standard self-custody asset protection",
        irrevocable: "Strict temporal asset lock; immune to coercion",
      },
      {
        dimension: "Parameter Modification",
        revocable: "Schedule, beneficiary, and basket rebalancing enabled",
        irrevocable: "Locked; requires guardian attestation if configured",
      },
      {
        dimension: "Beneficiary Certainty",
        revocable: "Subject to settlor modification during lifetime",
        irrevocable: "Absolute cryptographic guarantee of delivery",
      },
    ],
  },

  heartbeat: {
    title: "Vitality Heartbeat & The 28-Day Sovereign Grace Period",
    p1: "The cornerstone of automated succession is the **Vitality Engine**. Traditional dead-man switches suffer from premature firing: an owner travels without internet access, falls ill briefly, or simply forgets to log in, resulting in catastrophic accidental liquidation of their wealth to beneficiaries.",
    calloutTitle: "The 28-Day Sovereign Escalation Window",
    calloutText:
      "Heirloom enforces a mandatory **28-day Sovereign Grace Period** whenever a creator's standard vitality window lapses. The vault does NOT transfer assets immediately upon a missed cadence. Instead, an autonomous high-priority escalation period triggers multi-channel alerts (including the official [@HeirloomRHBot](https://t.me/heirloomportal) Telegram assistant). A single off-chain EIP-712 vitality signature during these 28 days instantly restores the vault to healthy active status.",
    sub1: "3.1 Gasless EIP-712 Check-Ins",
    p2: "Owners are never required to spend gas to prove they are alive. The owner signs an EIP-712 typed data structure within their wallet (hardware device, mobile passkey, or browser):",
    p3: "This signature is broadcasted to the decentralized Heirloom Relayer network. Relayers verify the ECDSA signature against the vault's registered `creator` address and submit the vitality update on-chain, subsidized by the vault's micro-reserve or the protocol fee engine.",
  },

  crossChain: {
    title: "Universal Cross-Chain Deposit Gateways",
    p1: "While Heirloom vaults settle natively on Robinhood Chain, capital is dispersed across fragmented ecosystems. To maximize liquidity and eliminate user friction, Heirloom introduces deterministic **Universal Ingestion Gateways** for Base and Ethereum Mainnet.",
    card1Title: "Base Ingestion Gateway",
    card1Text:
      "Users receive a dedicated Base deposit address. Inbound transfers of native **ETH** or **USDC** are automatically swept via atomic bridging to Robinhood Chain and split into the vault's asset basket.",
    card2Title: "Ethereum L1 Gateway",
    card2Text:
      "High-value institutional deposits on Ethereum Mainnet supporting **ETH**, **USDT**, and **USDC**. Batched settlement minimizes L1 gas overhead while funding Robinhood Chain vaults seamlessly.",
    p2: "Crucially, cross-chain deposit routing operates for **any vault** — whether newly initialized or active for decades. Third-party donors, family offices, or employers can fund a vault simply by sending assets to the multi-chain route identifier without interacting with Robinhood Chain directly.",
  },

  stealth: {
    title: "Stealth Vaults & ERC-5564 Privacy Relayers",
    p1: "Public blockchains create severe privacy vulnerabilities for wealth transfer: if a parent transfers $500,000 in tokenized equity to their child's known public wallet, blockchain surveillance engines immediately link both parties and expose the beneficiary's net worth to malicious actors, phishing cartels, and targeted exploits.",
    p2: "Heirloom implements **ERC-5564 Stealth Meta-Addresses**. Beneficiaries publish a single reusable stealth meta-address consisting of a spending key and a viewing key:",
    eq2Caption:
      "Equation 2: Non-interactive stealth key generation (Diffie-Hellman on secp256k1).",
    p3: "When the vault matures and assets vest, distributions are routed into ephemeral, one-time stealth addresses. Only the beneficiary — possessing the private spending key — can discover and unlock the funds. An on-chain observer cannot correlate the vault distributions with the beneficiary's public identity.",
  },

  encryption: {
    title: "Client-Side ECIES Letter Encryption",
    p1: "Inheritance is deeply personal. A financial trust devoid of guidance, values, and emotional context is incomplete. Heirloom incorporates the **Personal Letter Conveyance** protocol.",
    calloutTitle: "Zero-Knowledge Secret Delivery",
    calloutText:
      "Letters are never stored in plaintext on-chain or in centralized databases. In the client browser, the text is encrypted using **ECIES** (Elliptic Curve Integrated Encryption Scheme) with AES-256-GCM, keyed directly to the beneficiary's public key. The ciphertext is anchored to decentralized storage (IPFS/Arweave). Only when the vault state machine achieves `Matured` status does the decryption payload verify against the beneficiary's cryptographic signature.",
  },

  guardians: {
    title: "Bounded Guardian Verification & Negative Permissions",
    p1: "Traditional executors wield absolute unilateral authority over estate assets, creating rampant opportunities for self-dealing and embezzlement. Heirloom introduces **Bounded Guardians** governed by strict negative permissions:",
    bullet1:
      "**Emergency Dispute Pause:** A guardian can trigger a single 14-day pause if they detect an active fraud vector or coercion.",
    bullet2:
      "**Milestone Attestation:** In milestone-conditional trusts (e.g., beneficiary attaining age 25 or completing higher education), guardians attest completion via digital signature.",
    bullet3:
      "**Absolute Inability to Divert:** Under NO circumstances can a guardian change the beneficiary address, withdraw capital to their own address, or alter the portfolio allocations.",
  },

  formalSpec: {
    title: "Formal State Transitions & Mathematics",
    p1: "The lifecycle of an Heirloom vault represents a deterministic finite-state machine (FSM). Let `T_last` be the timestamp of the last recorded vitality heartbeat, `Δ_cadence` be the agreed check-in interval, and `τ_grace = 28 days = 2,419,200 seconds`.",
    eq3Caption:
      "Equation 3: Discrete state transition boundaries of the Vitality Engine.",
    p2: "Upon reaching `MATURED`, assets disburse according to the creator's tranche schedule:",
    eq4Caption:
      "Equation 4: Deterministic asset tranche allocation. Σ(TranchePercentage) = 100%.",
  },

  tokenomics: {
    title: "Protocol Governance & The $HEIR Ecosystem",
    p1: "The **$HEIR** protocol token aligns incentives among settlors, beneficiaries, automated keepers, and security researchers:",
    card1Title: "Keeper Gas Subsidies",
    card1Text:
      "Staked $HEIR yields automated keeper fees, financing gasless heartbeats and automated cross-chain deposit sweepers perpetually.",
    card2Title: "Asset Registry Governance",
    card2Text:
      "Token holders vote to approve new eligible tokenized stock registries, oracle providers, and RWA collateral types on Robinhood Chain.",
  },

  security: {
    title: "Security Model, Auditing & Legal Boundaries",
    calloutTitle: "Honest Legal Boundaries",
    calloutText:
      "Heirloom describes programmable cryptographic custody rules; it is not a statutory legal trust under probate law. Stock Tokens are tokenized debt securities governed by Robinhood Chain's underlying terms of service and issuer eligibility criteria. Users are strongly advised to coordinate their on-chain vaults with professional estate attorneys in their respective tax jurisdictions.",
    p1: "Smart contracts undergo continuous automated property-based testing and formal verification to guarantee that vault balances remain solvent, non-reentrant, and exclusively claimable by authenticated beneficiaries.",
  },

  cta: {
    title: "Ready to secure your generational legacy?",
    body: "Experience the Heirloom interactive builder on Robinhood Chain. Allocate stock tokens, establish your heartbeat schedule, and craft your sovereign vault.",
    build: "Build your vault",
    telegram: "Join Telegram Community",
  },
};
