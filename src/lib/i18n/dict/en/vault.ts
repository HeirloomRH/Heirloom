export const vault = {
  loading: "Loading your trust from Robinhood Chain…",
  notFoundTitle: "This trust isn't here.",
  notFoundBody: "It may not exist, or the backend is unreachable.",
  backToWorkspace: "Back to workspace",

  breadcrumbBack: "Your workspace",
  breadcrumbSample: "SAMPLE PREVIEW",
  breadcrumbLive: "LIVE TRUST VAULT",

  forPrefix: (name: string) => `FOR ${name}`,
  status: {
    successionTriggered: "Succession Triggered",
    activeFunded: "Active & Funded",
    pendingFunding: "Pending Funding",
  },
  tagline: "Generational wealth, programmed in code on Robinhood Chain.",

  refresh: "Refresh",
  refreshTitle: "Refresh balances from Robinhood Chain",
  export: "Export",
  exportSuccess: "Trust summary prepared for download.",
  exportFailed: "Download failed.",

  addressCard: {
    title: "Vault Address",
    copy: "Copy",
    copied: "Copied",
    explorer: "Explorer",
    deposit: "Deposit",
    activateLead: "Activate this trust:",
    activateBody:
      "Deposit tokenized assets directly to this vault address to fund it. Use the Deposit button above, or transfer manually from your wallet.",
  },

  summary: {
    eyebrow: "ON-CHAIN HOLDINGS & RESERVES",
    noAssets: "0.00 assets currently held in vault. Pending deposit.",
    configuredAssets: (n: number) => `${n} configured assets`,
    termsRevocable: "revocable terms",
    termsIrrevocable: "irrevocable terms",
  },

  tabsAriaLabel: "Trust details",
  tabs: {
    portfolio: "Portfolio",
    schedule: "Schedule",
    letter: "Letter",
  },

  portfolio: {
    title: "A foundation for tomorrow.",
    micro: "TARGET ASSET ALLOCATIONS",
    colAsset: "Asset",
    colAllocation: "Allocation",
    colBalance: "Live Vault Balance",
  },

  schedule: {
    title: "Good things, in their own time.",
    micro: "VESTING CLIFFS & TIMELINE",
    hint: "Vesting cliffs unlock assets on predetermined milestone dates or immediately upon succession execution.",
    cliffTooltip: (n: string, percent: number, date: string) =>
      `Cliff ${n}: ${percent}% (${date})`,
    cliffBadge: (n: string) => `Cliff ${n} · Milestone`,
    transferred: "Transferred to beneficiary",
    reachedUnlocked: "Milestone reached (Unlocked)",
    milestoneReached: "Milestone reached",
    inDays: (n: number) => `in ${n} days`,
    inMonths: (n: number) => `in ${n} months`,
    inYears: (n: string) => `in ~${n} years`,
    claimed: "Claimed",
    claimMilestone: "Claim Milestone",
    unlocked: "Unlocked",
    locked: "Locked",
    corpusShare: "Corpus Share",
    corpusShareSub: "of total trust assets",
    tokenRelease: "Token Release",
    pendingDeposit: "Pending on-chain deposit",
    pendingDepositWithAmount: (amount: string) =>
      `${amount} (pending on-chain deposit)`,
    releaseTrigger: "Release Trigger",
    triggerReached: "Calendar milestone reached",
    triggerPending:
      "Calendar unlock or upon Grantor succession execution",
  },

  letter: {
    decryptedEyebrow: "DECRYPTED PERSONAL LETTER",
    sealedTitle: "Personal Letter Sealed On-Chain",
    sealedBody:
      "Encrypted with AES-256-GCM. Unlocks for the beneficiary when active or triggered.",
    unlockCta: "Unlock & Read Letter",
    emptyTitle: "A story still to be written.",
    emptyBody: "No personal letter was attached to this trust.",
    dialogTitle: "Letter to the Beneficiary",
  },

  heartbeat: {
    title: "Dead-Man's Switch",
    daysRemaining: "days remaining",
    missed:
      "Heartbeat window missed. Succession plan is now active for the beneficiary.",
    window: (days: number) =>
      `Window: ${days} days. If a check-in is missed, succession executes automatically.`,
    signing: "Signing...",
    checkIn: "Check In (Gasless)",
  },

  access: {
    title: "Your Access",
    isGrantor: "You are the Grantor (Creator)",
    isBeneficiary: "You are the Beneficiary",
    connectPrompt: "Connect your wallet to check in or claim",
    connectWallet: "Connect Wallet",
  },

  deposit: {
    title: "Deposit Assets",
    intro:
      "Select an asset and amount to deposit into this vault on Robinhood Chain. Your wallet will prompt you to sign the transaction.",
    assetLabel: "Asset",
    amountLabel: "Amount",
    walletPrefix: "Wallet:",
    max: "MAX",
    amountPlaceholder: "e.g. 10.5",
    zeroBalance: (symbol: string) =>
      `Your connected wallet has 0 ${symbol} on Robinhood Chain. You must fund your wallet with ${symbol} first before depositing.`,
    toVault: "To vault",
    cancel: "Cancel",
    sending: "Sending…",
    send: "Send Deposit",
    pendingTitle: "Transaction Submitted",
    pendingBody:
      "Your deposit transaction has been broadcast to Robinhood Chain. Waiting for confirmation…",
    viewTransaction: "View Transaction",
    successTitle: "Deposit Confirmed",
    successBodyPrefix: "Your deposit of",
    successBodySuffix:
      "was confirmed on Robinhood Chain. Your vault balances are being refreshed.",
    viewOnExplorer: "View on Explorer",
  },

  notices: {
    successTitle: "Success",
    done: "Done",
    errorTitle: "Something went wrong",
    dismiss: "Dismiss",
  },

  errors: {
    loadFailed: "Failed to load trust from Robinhood Chain.",
    connectToDeposit: "Connect your wallet to deposit assets.",
    selectAsset: "Please select an asset to deposit.",
    invalidAmount: "Please enter a valid amount greater than 0.",
    txFailed: "Transaction failed or was rejected.",
    connectGrantor: "Connect the Grantor wallet to submit a check-in.",
    onlyGrantor:
      "Only the Grantor wallet can check in to extend the dead-man's switch.",
    heartbeatFailed: "Failed to submit heartbeat signature.",
    noDeposit: "No new deposit confirmed on-chain yet.",
    unlockFailed: "Failed to unlock encrypted letter.",
    connectBeneficiary: "Please connect beneficiary wallet to claim.",
    claimFailed: "Failed to execute claim payout.",
  },

  success: {
    heartbeat: "Heartbeat confirmed! Dead-man's switch deadline extended.",
    depositVerified: "Corpus deposit verified on Robinhood Chain!",
  },

  beneficiaryFallback: "Beneficiary",
  tokenSuffix: " Token",
};
