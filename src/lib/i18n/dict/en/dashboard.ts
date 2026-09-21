export const dashboard = {
  eyebrow: "YOUR ON-CHAIN TRUST WORKSPACE",
  title: "For all their tomorrows.",
  description:
    "Non-custodial tokenized stock trusts powered by Robinhood Chain.",
  createCta: "Create a trust",

  unnamedTrust: "Unnamed Trust",
  notAvailable: "N/A",

  connectPrompt: {
    title: "Connect your Robinhood Chain wallet",
    body: "Connect to view your grantor vaults, sign off-chain heartbeats, and claim beneficiary inheritances.",
  },

  stats: {
    trustsLabel: "On-chain Trusts",
    trustsNote: "Live across Robinhood Chain",
    fundedLabel: "Funded & Active",
    fundedNote: "Corpus deposited & armed",
    beneficiariesLabel: "Beneficiary Wallets",
    beneficiariesNote: "Named inheritance recipients",
  },

  tools: {
    heading: "Trusts",
    refresh: "Refresh",
    refreshTitle: "Refresh from Robinhood Chain",
    searchAriaLabel: "Search trusts",
    searchPlaceholder: "Search by name, address, or vault…",
    filterAriaLabel: "Filter trusts by status",
    showGrid: "Show grid",
    showList: "Show list",
  },

  filters: {
    all: "All statuses",
    grantor: "Created by me (Grantor)",
    beneficiary: "Inherited by me (Beneficiary)",
    active: "Active (Armed)",
    pendingFunding: "Pending Funding",
    successionTriggered: "Succession Triggered",
    paused: "Paused",
  },

  status: {
    active: "Active · Armed",
    pendingFunding: "Pending Funding",
    successionTriggered: "Succession Triggered",
    paused: "Paused",
  },

  loading: "Querying Robinhood Chain trust index…",
  loadError: "Failed to load on-chain trusts from Robinhood Chain.",

  card: {
    grantorBadge: "Grantor",
    beneficiaryBadge: "Beneficiary",
    forPrefix: "For:",
    dedicatedVault: (index: number) => `Dedicated Vault #${index}`,
    revocable: "Revocable Trust",
    irrevocable: "Irrevocable Trust",
    createdPrefix: "Created",
  },

  empty: {
    noMatchTitle: "No matching trusts.",
    noMatchBody: "Try adjusting your search query or filter criteria.",
    clearFilters: "Clear filters",
    firstTitle: "Every legacy begins somewhere.",
    firstBody:
      "Create your first non-custodial trust fund on Robinhood Chain, or inspect a live on-chain vault.",
    firstCta: "Create your first trust",
    inspectCta: "Inspect live verified Vault #4",
  },

  bottom: {
    title: "The plan is only part of the story.",
    body: "A personal encrypted letter gives your portfolio enduring meaning.",
    cta: "Learn about letters",
  },

  errorDialog: {
    title: "Something went wrong",
    dismiss: "Dismiss",
    retry: "Try Again",
  },
};
