/**
 * Page titles and descriptions. The route `head` config is static and runs
 * outside React, so it keeps the English strings for crawlers and the initial
 * SSR response; `usePageMeta` applies these to the live document whenever the
 * reader switches language.
 */
export const meta = {
  home: {
    title: "Heirloom — A future worth passing on.",
    description:
      "Build a portfolio. Write your wishes. Give the people you love a future to grow into. Explore the Heirloom programmable trust vault frontend.",
  },
  app: {
    title: "Your workspace · Heirloom",
    description:
      "Your family workspace: demo trusts, upcoming milestones, and the people at the heart of each one.",
  },
  create: {
    title: "Create a trust · Heirloom",
    description:
      "Build a demo trust: portfolio, beneficiary, terms, and a personal letter. Saved locally in your browser — no funds are deposited.",
  },
  docs: {
    title: "Documentation · Heirloom",
    description:
      "The Heirloom handbook: how vaults work, portfolios, schedules, heartbeats, guardians, and boundaries.",
  },
  roadmap: {
    title: "The long view · Heirloom",
    description:
      "The Heirloom roadmap: from a first vault to a lasting, multi-generation legacy.",
  },
  vault: {
    title: "Your trust · Heirloom",
    description:
      "A demo trust in detail: portfolio, release schedule, check-ins, and a personal letter.",
  },
  whitepaper: {
    title: "Technical Whitepaper · Heirloom Protocol",
    description:
      "Heirloom Protocol Technical Whitepaper: Deterministic RWA custody, programmable estate succession, dead-man vitality verification, and 28-day grace periods on Robinhood Chain.",
  },
};
