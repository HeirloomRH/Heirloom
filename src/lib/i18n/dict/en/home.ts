export const home = {
  hero: {
    ariaLabel: "Give your family the freedom to build a better tomorrow.",
    lines: ["Give your family the", "freedom to build a", "better tomorrow."],
    intro:
      "Bring your portfolio, your people, and your wishes together. Build a future they can grow into.",
    createCta: "Create a trust",
    sampleCta: "Explore the sample workspace ↗",
  },

  // Animated hero illustration (reference-hero.tsx)
  reference: {
    ariaLabel:
      "Animated illustration: a portfolio becomes a connected plan, then a family workspace",
    sectionLabel: "How Heirloom works",
    play: "Play hero animation",
    pause: "Pause hero animation",
    steps: [
      {
        title: "Build the portfolio.",
        body: "Bring your long-term intentions together with a basket of eligible Stock Tokens and ETFs.",
      },
      {
        title: "Connect the people and the plan.",
        body: "Set beneficiaries, milestones, and guardian permissions. Your wishes become the rules.",
      },
      {
        title: "See what comes next.",
        body: "Keep the portfolio, scheduled releases, and personal letters in one clear view.",
      },
    ],
    nodes: [
      "Portfolio",
      "Beneficiaries",
      "Milestones",
      "Guardians",
      "Your wishes",
      "A lasting legacy",
    ],
  },

  // Floating cards in the scroll-driven network illustration.
  networkCards: [
    "Emma’s tomorrow",
    "The family portfolio",
    "A first home",
    "A little head start",
    "Leo’s next chapter",
    "Room to dream",
    "Your long-term wishes",
    "An education",
    "A trusted guardian",
    "A letter for tomorrow",
    "Maya’s first step",
    "A lasting intention",
  ],

  statement: {
    titleLine1: "Your wishes.",
    titleLine2: "The source of truth.",
    body: "Keep the portfolio, the people, and the plan in one clear view. Set the rules today, so the people you love can understand tomorrow.",
    cta: "Understand the vault",
  },

  atmosphere: {
    eyebrow: "A CLEAR VIEW OF WHAT COMES NEXT",
    titleLine1: "A legacy you can see.",
    titleLine2: "A plan they can follow.",
    note: "Illustrative vault · sample values · no funds held",
  },

  darkNote: {
    lead: "Trust, made explicit.",
    body: "Guardian permissions are designed to be bounded. The production contracts must enforce every rule.",
    cta: "Read the boundaries",
  },

  workflow: {
    eyebrow: "SMALL STEPS. LASTING INTENTIONS.",
    title: "From “one day” to day one.",
    steps: {
      create: {
        label: "01 / Create",
        body: "A first investment in their future. Choose a portfolio and name the person it’s for.",
        artLabel: "THE BEGINNING",
        artTitle: "Something to grow.",
        artBasket: "Stock Token basket",
        artNote: "Illustrative allocation",
      },
      protect: {
        label: "02 / Protect",
        body: "Make room for life’s milestones. Set dates, allowances, and people who can help.",
        artLabel: "THE PLAN",
      },
      passOn: {
        label: "03 / Pass on",
        body: "Leave more than a portfolio. Add a letter that tells them why you started.",
        letterLabel: "A LETTER FOR YOUR TOMORROW",
        letterLine1: "Dear Emma,",
        letterLine2: "This is for the life you’ll build.",
        letterLine3: "Make it wonderfully yours.",
        letterSignature: "With love, always.",
      },
    },
  },

  capability: {
    headTitleLine1: "A little thought today.",
    headTitleLine2: "A lot taken care of tomorrow.",
    headBody: "One place for the details that matter.",
    rows: {
      portfolio: {
        title: "Portfolio",
        tag: "A foundation to build on",
        body: "Eligible Stock Tokens and ETFs, with a clear allocation.",
      },
      vesting: {
        title: "Vesting",
        tag: "The right time, written in",
        body: "Cliffs and scheduled releases shaped around your intentions.",
      },
      heartbeat: {
        title: "Heartbeat",
        tag: "A plan that carries on",
        body: "Configurable check-ins for your succession instructions.",
      },
      guardians: {
        title: "Guardians",
        tag: "A helping hand, with limits",
        body: "Named oversight for pauses and milestone approvals.",
      },
      terms: {
        title: "Vault terms",
        tag: "A deliberate commitment",
        body: "Choose revocable or irrevocable terms, with clear acknowledgement.",
      },
      letter: {
        title: "A personal letter",
        tag: "The part only you can write",
        body: "Give the portfolio a story, in your own words.",
      },
    },
  },

  roadmapStrip: {
    eyebrow: "BUILT FOR THE LONG VIEW",
    body: "Start with a vault. Grow into generations.",
    cta: "Explore the roadmap",
  },

  dashboard: {
    eyebrow: "YOUR FAMILY’S BIGGER PICTURE",
    titleLine1: "Everything you’re",
    titleLine2: "building for them.",
    body: "See your trusts, upcoming milestones, and the people at the heart of each one. A quiet place to keep a long-term promise.",
    cta: "Explore the app",
    mock: {
      overview: "Overview",
      myTrusts: "My trusts",
      beneficiaries: "Beneficiaries",
      activity: "Activity",
      workspace: "Your family workspace",
      breadcrumb: "WORKSPACE / OVERVIEW",
      sampleLabel: "SAMPLE WORKSPACE",
      title: "For all their tomorrows.",
      subtitle: "Good intentions, with a plan behind them.",
      portfolioValue: "Portfolio value",
      trustVaults: "Trust vaults",
      nextMilestone: "Next milestone",
      milestoneValue: "18th",
      milestoneUnit: "birthday",
      vaultName: "Emma’s tomorrow",
      scheduled: "Scheduled",
      chartNote: "Illustrative chart · not investment performance",
      viewTrust: "View trust",
    },
  },

  // Shared sample-vault illustration (home-art.tsx)
  vaultArt: {
    name: "Emma’s tomorrow",
    scheduled: "Scheduled",
    micro: "A LITTLE HEAD START, FROM ME TO YOU.",
    valueNote: "Illustrative portfolio value",
    assets: "3 assets",
    milestones: [
      { label: "18th birthday", share: "25% of portfolio" },
      { label: "21st birthday", share: "25% of portfolio" },
      { label: "25th birthday", share: "50% of portfolio" },
    ],
    openSample: "Open sample trust",
  },

  // Mini schedule inside the "Protect" workflow card
  miniSchedule: [
    { label: "18th birthday", share: "25%" },
    { label: "21st birthday", share: "25%" },
    { label: "25th birthday", share: "50%" },
  ],

  faq: [
    {
      q: "Is Heirloom a legal trust?",
      a: "Heirloom is a programmable vault concept, not a statutory legal trust. Its rules are intended to be executed by smart contracts. Appropriate legal estate planning may still be needed.",
    },
    {
      q: "Can I put real assets into this preview?",
      a: "No. This frontend lets you build and save a demo vault in your browser. It does not connect to a deployed Heirloom vault, move funds, or execute distributions.",
    },
    {
      q: "What happens if I miss a check-in?",
      a: "The intended succession plan activates after a configured check-in window and grace period. In this preview, check-ins only update local demo state; no transfer or automated succession occurs.",
    },
    {
      q: "Can a guardian take the portfolio?",
      a: "The proposed guardian role can pause distributions or attest milestones. It is designed to have no power to redirect assets. Those limits must be verified in the production contracts.",
    },
    {
      q: "What is $HEIR?",
      a: "$HEIR is a planned protocol token described in the roadmap. This frontend does not offer token purchases, staking, or a verified token contract.",
    },
  ],

  finalCta: {
    eyebrow: "SOMETHING THEY’LL CARRY FORWARD.",
    titleLine1: "The best time to start",
    titleLine2: "a legacy is today.",
    cta: "Create your first trust",
    note: "Explore the demo. Imagine the possibilities.",
  },
};
