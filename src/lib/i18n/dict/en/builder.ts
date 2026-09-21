export const builder = {
  breadcrumbBack: "Your workspace",
  breadcrumbCurrent: "CREATE A TRUST",

  progressAriaLabel: "Creation progress",
  steps: ["Portfolio", "Beneficiary", "Terms", "Letter", "Review"],
  stepCounter: (n: number) => `STEP ${String(n).padStart(2, "0")} / 05`,

  titles: [
    "The foundation.",
    "Someone worth building for.",
    "Your wishes, written in.",
    "More than a portfolio.",
    "A promise, made clear.",
  ],
  descriptions: [
    "Give their tomorrow a place to begin.",
    "Put a person at the heart of your plan.",
    "Choose when and how the future unfolds.",
    "Tell them why you started.",
    "Read the plan carefully before saving your trust.",
  ],

  // Validation messages. Codes come from validation.mjs.
  errors: {
    nameRequired: "Give your trust a name.",
    beneficiaryRequired: "Enter the beneficiary's name.",
    beneficiaryWallet:
      "Enter a valid wallet address for the beneficiary (0x followed by 40 hex characters).",
    guardianWallet: "Enter a valid guardian wallet, or leave it blank.",
    guardianSameAsBeneficiary:
      "Use a different wallet for the guardian and beneficiary.",
    grantorRequired:
      "Please connect your wallet or enter a valid grantor wallet address.",
    ackRequired: "Please acknowledge the trust terms before sealing.",
    typeIrrevocable:
      "Type IRREVOCABLE to confirm you understand the permanent terms.",
    createFailed:
      "Failed to create trust on Robinhood Chain. Please try again.",
    amount_range: "Enter a demo amount between $1 and $100,000,000.",
    allocation_positive:
      "Each selected asset needs an allocation greater than 0%.",
    allocation_total: "Your portfolio allocations must total 100%.",
    schedule_empty: "Add at least one release date.",
    schedule_future: "Choose valid future dates for every release.",
    schedule_order:
      "Release dates must be in chronological order, with no duplicates.",
    release_range: "Each release must be greater than 0% and no more than 100%.",
    release_total: "Your release percentages must total 100%.",
  },

  step0: {
    nameLabel: "Trust name",
    namePlaceholder: "e.g. Emma's tomorrow",
    amountLabel: "Starting portfolio value",
    amountHint: "Illustrative USD amount",
    amountAriaLabel: "Starting portfolio value",
    basketHeading: "Build your basket",
    basketHint: "Select token allocations for your trust portfolio.",
    addAsset: (symbol: string) => `Add ${symbol}`,
    removeAsset: (symbol: string) => `Remove ${symbol}`,
    allocationPercent: (symbol: string) => `${symbol} allocation percent`,
    callout: "This basket is a starting point, not an investment recommendation.",
  },

  step1: {
    nameLabel: "Beneficiary name",
    namePlaceholder: "Who is this for?",
    walletLabel: "Beneficiary wallet",
    hint: "The intended receiving wallet. The address must be correct before any vault is created.",
  },

  step2: {
    scheduleHeading: "Vesting schedule",
    allocated: (percent: number) => `${percent}% allocated`,
    scheduleHint:
      "Each percentage is a share of the original portfolio allocation, not the remaining balance.",
    releaseDate: "Release date",
    releasePercent: "Release %",
    releaseDateAria: (n: number) => `Release ${n} date`,
    releasePercentAria: (n: number) => `Release ${n} percent`,
    removeRelease: (n: number) => `Remove release ${n}`,
    addRelease: "Add a release",
    modeLegend: "Vault mode",
    revocable: "Revocable",
    revocableNote: "Creator retains the intended ability to revoke.",
    irrevocable: "Irrevocable",
    irrevocableNote: "Designed to be permanent once sealed on-chain.",
    heartbeatLabel: "Succession check-in window",
    heartbeatDisabled: "Disabled — no automatic succession",
    heartbeatEvery: (days: number) => `Every ${days} days`,
    guardianLabel: "Guardian wallet",
    guardianHint: "Optional · planned bounded oversight",
  },

  step3: {
    eyebrow: "A LETTER FOR THEIR TOMORROW",
    srLabel: "Letter to your beneficiary",
    placeholder: (name: string) =>
      `Dear ${name},\n\nThis is for the life you'll build…`,
    placeholderFallback: "you",
    counter: (used: string) => `${used} / 5,000 characters`,
    hint: "Optional. Your letter is encrypted end-to-end with AES-256-GCM and stored sealed until milestone releases or succession triggers.",
  },

  review: {
    for: "For",
    corpus: "Corpus estimate",
    terms: "Terms",
    checkIns: "Check-ins",
    checkInsEvery: (days: number) => `Every ${days} days`,
    checkInsDisabled: "Disabled",
    guardian: "Guardian",
    guardianRegistered: "Registered on-chain",
    guardianNone: "None",
    letter: "Letter",
    letterSealed: "Encrypted & sealed",
    letterNone: "Not added",
    beneficiary: "Beneficiary",
    grantor: "Grantor",
    connectedSuffix: "(Connected)",
    notConnected: "Not connected",
    connectPrompt: "Connect your wallet or enter creator address:",
    connectWallet: "Connect Wallet",
    modeRevocable: "Revocable",
    modeIrrevocable: "Irrevocable",
  },

  ack: {
    title: "Permanent means permanent.",
    body: "In an irrevocable vault, the grantor cannot undo, reclaim, or rewrite the terms once sealed.",
    typeLabel: "Type IRREVOCABLE to acknowledge",
    checkbox:
      "I understand that Heirloom creates a programmable trust vault on Robinhood Chain. My assets will be isolated and managed by code according to these terms.",
  },

  actions: {
    back: "Back",
    cancel: "Cancel",
    continue: "Continue",
    sealing: "Sealing trust on-chain…",
    seal: "Seal Trust on Robinhood Chain",
  },

  aside: {
    eyebrow: "YOUR LEGACY, TAKING SHAPE",
    untitled: "Something for tomorrow.",
    forSomeone: (name: string) => `For ${name}. With intention.`,
    noBeneficiary: "A small beginning. A lasting intention.",
    illustrative: "ILLUSTRATIVE PORTFOLIO",
    bottom: "Built around your wishes.",
    disclaimer:
      "All values are illustrative. Saved trusts are written to Robinhood Chain.",
  },

  errorDialog: {
    title: "Check your details",
    gotIt: "Got it",
  },

  success: {
    title: "Trust Sealed On-Chain",
    body: "Your trust has been created on Robinhood Chain with a dedicated vault address:",
    opening: (seconds: number) => `Opening your live vault in ${seconds}s…`,
    viewVault: "View Vault Now",
  },
};
