export const docs = {
  ui: {
    label: "DOCS",
    breadcrumbRoot: "Documentation",
    navAriaLabel: "Documentation navigation",
    openMenu: "Open documentation menu",
    closeMenu: "Close documentation menu",
    closeNav: "Close navigation",
    searchPlaceholder: "Find an answer…",
    searchAriaLabel: "Search documentation",
    resultsSuffix: "RESULTS",
    noMatches: "Try another search term.",
    sidebarStatus: "Frontend preview",
    sidebarNote: "A working demo of a long-term idea.",
    sidebarCta: "Try the builder",
    openApp: "Open app",

    searchResultsAriaLabel: "Search results",
    searchKicker: "SEARCH THE HANDBOOK",
    closeResults: "Close search results",
    resultsFor: (query: string) => `Results for “${query}”`,
    articlesFound: (n: number) =>
      `${n} ${n === 1 ? "article" : "articles"} found`,
    noResultsTitle: "No answers found yet.",
    noResultsBody: "Try “guardian”, “schedule”, or “portfolio”.",
    clearSearch: "Clear search",

    minRead: (n: number) => `${n} min read`,
    copyLink: "Copy link",
    linkCopied: "Link copied",
    copyFallback: (id: string) => `Copy this link: /docs/#${id}`,

    overviewHeading: "Overview",
    previewHeading: "In the current preview",
    primarySource: "PRIMARY SOURCE",

    previousLabel: "PREVIOUS",
    nextLabel: "NEXT",
    footerLabel: "Heirloom documentation",
    footerCta: "View the roadmap",

    tocLabel: "ON THIS PAGE",
    tocOverview: "Overview",
    tocPreview: "In this preview",
    tocNext: "Make your first plan",
    tocAsideTitle: "Built with intention.",
    tocAsideBody: "Start small. Make the details count.",
    tocAsideCta: "Create a trust",
  },

  // Landing article ("preview") gets bespoke framing.
  intro: {
    titleLine1: "A clear plan.",
    titleLine2: "A lasting legacy.",
    deck: "The essentials of Heirloom, from your first portfolio to the wishes that guide it.",
    // Every other article shares one deck template.
    deckTemplate: (topic: string) =>
      `A practical guide to ${topic} in Heirloom.`,
    coverTop: "THE HEIRLOOM HANDBOOK",
    coverIndex: "01 — BEGIN HERE",
    coverLine1: "Good intentions.",
    coverLine2: "Clear instructions.",
    coverA: "Portfolio",
    coverB: "People",
    coverC: "Purpose",
    startHeading: "Make your first plan",
    start1Title: "Create a demo trust",
    start1Body: "Portfolio, beneficiary, terms, and letter.",
    start2Title: "Explore a sample",
    start2Body: "See how the pieces come together.",
  },

  groups: {
    gettingStarted: "GETTING STARTED",
    buildYourPlan: "BUILD YOUR PLAN",
    protocol: "PROTOCOL",
  },

  shortNames: {
    preview: "Introduction",
    vaults: "How vaults work",
    portfolio: "Portfolio & assets",
    schedules: "Release schedules",
    heartbeat: "Heartbeats",
    guardians: "Guardians",
    modes: "Vault terms",
    letters: "Personal letters",
    network: "Robinhood Chain",
    boundaries: "Risks & boundaries",
    token: "$HEIR roadmap",
  },

  articles: {
    preview: {
      title: "Start here: the frontend preview",
      tag: "GETTING STARTED",
      text: "This site is an interactive demonstration of Heirloom. Create a demo trust, choose illustrative allocations, write a release schedule, and save it in this browser. No funds are held. No wallet is authenticated, and no smart contract is called.",
      extra:
        "Saved demos are local to this browser and device. Clearing site storage removes them. Export a JSON demo plan from a trust page to keep a copy; export includes the beneficiary wallet and letter. Exported plans cannot be imported through this version. Sample trust changes reset on reload.",
      sourceLabel: "",
    },
    vaults: {
      title: "The vault: a portfolio with a purpose",
      tag: "CORE CONCEPT",
      text: "A Heirloom vault is intended to hold a portfolio under explicit distribution rules. The creator sets the beneficiaries and terms. The production system must enforce those terms in verified smart contracts.",
      extra:
        "The frontend supports one beneficiary per demo trust, a basket of sample assets, and up to six scheduled releases. Multiple beneficiaries, asset deposits, monthly contributions, and real balances are future integration work.",
      sourceLabel: "",
    },
    portfolio: {
      title: "Stock Tokens & eligibility",
      tag: "THE FOUNDATION",
      text: "The product is designed around eligible tokenized stocks and ETFs. The frontend asset list is illustrative; it is not a verified asset registry or an offer to acquire any asset.",
      extra:
        "Robinhood describes Stock Tokens as tokenised debt securities providing economic exposure to underlying securities, without legal or beneficial ownership rights in those underlying securities. Production access must check jurisdiction, participant eligibility, token registry status, and current issuer restrictions.",
      sourceLabel: "Robinhood Stock Token documentation",
    },
    schedules: {
      title: "Vesting & release schedules",
      tag: "YOUR TERMS",
      text: "Choose future release dates and the percentage assigned to each date. The percentages must total 100%, and dates must run in chronological order. A 25% / 25% / 50% schedule refers to the original allocation, not the remaining portfolio.",
      extra:
        "The demo stores dates and allocation percentages; it does not release assets. Production needs a precise timezone policy, deterministic token-unit allocation, rounding rules, a distribution executor, finality handling, and protection against repeated execution.",
      sourceLabel: "",
    },
    heartbeat: {
      title: "Heartbeats & succession",
      tag: "CONTINUITY",
      text: "A heartbeat is a periodic check-in from the creator. The intended design uses an elapsed check-in window and a grace period to activate a predefined succession plan.",
      extra:
        "In this preview, “I’m here” only updates a local timestamp. Missed check-ins do not trigger a transfer. Production requires an agreed grace period, secure notifications, ownership proof, and independently verified execution. A missed check-in is not legal proof of death.",
      sourceLabel: "",
    },
    guardians: {
      title: "Guardians, with boundaries",
      tag: "PEOPLE & PERMISSIONS",
      text: "A guardian is a named wallet intended to provide bounded oversight. Proposed powers include pausing distributions and attesting milestones. Guardians are not intended to redirect the portfolio.",
      extra:
        "This preview records an optional guardian address. It does not authenticate that wallet, implement multisignature approvals, or execute milestone attestations. The production contracts must enumerate and enforce every permission.",
      sourceLabel: "",
    },
    modes: {
      title: "Revocable & irrevocable terms",
      tag: "A DELIBERATE CHOICE",
      text: "Revocable mode is designed to preserve a creator’s ability to revoke under the final contract policy. Irrevocable mode is designed to remove that ability after sealing. Choose deliberately.",
      extra:
        "The builder asks for a typed IRREVOCABLE acknowledgement before saving that demo mode. This is an educational acknowledgement; no vault is sealed. Even a demo marked irrevocable can be removed from local storage, because it is only a local plan.",
      sourceLabel: "",
    },
    letters: {
      title: "The letter only you can write",
      tag: "PERSONAL INTENT",
      text: "Add an optional letter to tell the beneficiary why you started. It appears on the trust’s Letter tab and is included in a downloaded demo plan.",
      extra:
        "Letters in this frontend are plain text in browser storage. They are not encrypted or private from people who can access this browser. Do not enter secrets or sensitive personal information. Encrypted storage, key recovery, and beneficiary delivery require production implementation.",
      sourceLabel: "",
    },
    network: {
      title: "Designed for Robinhood Chain",
      tag: "NETWORK",
      text: "The intended network is Robinhood Chain, using ETH for gas.",
      extra:
        "Heirloom connects to Robinhood Chain for real-time vault status, balances, and digital heartbeats.",
      sourceLabel: "Official network configuration",
    },
    boundaries: {
      title: "Risks & honest boundaries",
      tag: "READ BEFORE USING",
      text: "Heirloom describes programmable custody rules, not a statutory legal trust. This frontend is not legal, tax, or investment advice. Estate planning can require appropriate professional support and jurisdiction-specific arrangements.",
      extra:
        "Production risks include loss of capital, issuer and counterparty risk, smart-contract defects, compromised keys, inaccurate data, unavailable services, and irreversible transactions. No return, fee, availability, security audit, or perpetual execution is guaranteed by this preview. Market values may fall. Eligibility is not checked here.",
      sourceLabel: "",
    },
    token: {
      title: "The planned $HEIR token",
      tag: "ROADMAP",
      text: "The product brief includes a future protocol token, premium features, and potential protocol fee mechanisms. Commercial policies and contract configuration remain unresolved.",
      extra:
        "There is no token purchase or staking flow in this frontend. No token contract or reward rate is verified. The roadmap is a product plan, not a release-date or investment commitment.",
      sourceLabel: "",
    },
  },
};
