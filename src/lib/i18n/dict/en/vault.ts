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
    inGracePeriod: "28-Day Grace Period",
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
    cliffTooltip: (n: string, percent: number, date: string) => `Cliff ${n}: ${percent}% (${date})`,
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
    pendingDepositWithAmount: (amount: string) => `${amount} (pending on-chain deposit)`,
    releaseTrigger: "Release Trigger",
    triggerReached: "Calendar milestone reached",
    triggerPending: "Calendar unlock or upon Grantor succession execution",
  },

  letter: {
    decryptedEyebrow: "DECRYPTED PERSONAL LETTER",
    sealedTitle: "Personal Letter Sealed On-Chain",
    sealedBody: "Encrypted with AES-256-GCM. Unlocks for the beneficiary when active or triggered.",
    unlockCta: "Unlock & Read Letter",
    emptyTitle: "A story still to be written.",
    emptyBody: "No personal letter was attached to this trust.",
    dialogTitle: "Letter to the Beneficiary",
  },

  heartbeat: {
    title: "Dead-Man's Switch",
    daysRemaining: "days remaining",
    missed: "Heartbeat window missed. Succession plan is now active for the beneficiary.",
    gracePeriod: (days: number) =>
      `Safety grace period active: ${days} days remaining to check in before succession unlocks for the beneficiary.`,
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
    successBodySuffix: "was confirmed on Robinhood Chain. Your vault balances are being refreshed.",
    viewOnExplorer: "View on Explorer",

    modeLabel: "How would you like to fund this?",
    modeDirect: "Send one asset",
    modeDirectHint: "Transfer a single token straight to the vault.",
    modeBasket: "Deposit with ETH or USDG (Auto-Split Basket)",
    modeBasketHint:
      "Pay once in ETH or USDG. The router buys the whole basket and delivers it to the vault in a single transaction.",

    inputAssetLabel: "Deposit Currency",
    inputAssetEth: "ETH",
    inputAssetUsdg: "USDG (Dollar)",

    basketIntro:
      "Your ETH is split across this trust's target allocations and swapped in one transaction. The tokens are delivered straight to the vault address, never to your wallet.",
    basketIntroUsdg:
      "Your USDG is split across this trust's target allocations in one transaction. Equity tokens are bought on Robinhood Chain pools, and any USDG target is sent straight to the vault.",
    basketAmountLabel: "Amount to deposit",
    basketAmountPlaceholder: "e.g. 0.5",
    basketBalance: "Your balance:",
    basketPreviewTitle: "You will receive",
    colTarget: "Target",
    colSpend: "Input share",
    colReceive: "Est. received",
    estimateUnavailable: "No quote",
    passthroughNote: "Held as-is",
    fallbackNote: (symbol: string) => `Routed to ${symbol}`,
    creditNote: "Bought via Orbio Exchange",
    basketRouted: "Swapped",
    basketPassthrough: "Transferred",
    basketTotal: "Total",

    approveUsdg: "Approve USDG",
    approvingUsdg: "Approving USDG…",
    approvalSubmitted: "USDG approval transaction submitted to Robinhood Chain…",
    approvalSuccess: "USDG approved for SwapRouter!",

    sealedExecutionLabel: "Execution Privacy",
    sealedExecutionPublic: "Public Multicall",
    sealedExecutionDarkpool: "Sealed Relayer (Darkpool)",
    sealedExecutionDarkpoolHint:
      "Shields your wallet identity. Authorized via off-chain Permit2 signature and settled on-chain by the Heirloom Relayer straight to your vault.",
    sealedExecutionCreditForced:
      "Sealed Relayer (Darkpool) — required because this basket includes a CREDIT allocation, which only the relayer can deliver.",

    approvePermit2: "Approve Permit2",
    approvingPermit2: "Approving Permit2…",
    permit2ApprovalSubmitted: "Permit2 approval submitted to Robinhood Chain…",
    permit2ApprovalSuccess: "USDG approved for Permit2!",

    signSealedDeposit: "Sign & Sealed Deposit",
    signingSealedDeposit: "Requesting Permit2 signature…",
    relayingSealedDeposit: "Heirloom Relayer executing on Robinhood Chain…",
    relayerUnavailable: "The Heirloom Relayer is temporarily offline. Please use public multicall.",

    slippageLabel: "Slippage tolerance",
    slippageHint:
      "If a leg cannot fill within this tolerance it converts to USDG instead of reverting your whole deposit.",
    slippageCustom: "Custom",

    routerCheckingTitle: "Checking swap liquidity…",
    routerUnavailableTitle: "Auto-split is not available on this network yet",
    routerUnavailableRouter:
      "No Uniswap router is deployed on Robinhood Chain at the configured address, so there is nowhere to route the swap.",
    routerUnavailableQuoter:
      "The swap router is live on Robinhood Chain, but its quoter is unreachable, so the amounts you would receive cannot be guaranteed. Send a single asset instead rather than swapping blind.",
    routerUnavailableProbe:
      "Could not reach Robinhood Chain to confirm swap liquidity. Send a single asset instead, or try again in a moment.",
    routerUnavailableAction: "Send one asset instead",
    quotesUnavailable:
      "Live quotes are unavailable, so the amounts you would receive cannot be shown. The ETH split below is exact.",

    basketSend: "Swap & Deposit",
    basketReview: "Review split",
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
    onlyGrantor: "Only the Grantor wallet can check in to extend the dead-man's switch.",
    heartbeatFailed: "Failed to submit heartbeat signature.",
    noDeposit: "No new deposit confirmed on-chain yet.",
    unlockFailed: "Failed to unlock encrypted letter.",
    connectBeneficiary: "Please connect beneficiary wallet to claim.",
    claimFailed: "Failed to execute claim payout.",

    // Basket planning codes from src/lib/heirloom/basket.mjs.
    basket_empty: "This trust has no target allocations to split into.",
    basket_allocation_positive:
      "Every allocation must be greater than 0% before a basket deposit can be routed.",
    basket_allocation_total: "Target allocations must add up to 100%.",
    basket_duplicate_symbol:
      "This trust lists the same asset twice; a basket deposit needs one row per asset.",
    basket_amount_positive: "Enter an ETH amount greater than 0.",
    slippage_invalid: "Slippage tolerance must be a whole number of basis points.",
    slippage_too_low: "Slippage tolerance must be at least 0.01%.",
    slippage_too_high: "Slippage tolerance cannot exceed 50%.",
    routerUnavailable:
      "Swap routing is unavailable on this network, so the basket cannot be executed.",
    quotesRequired: "Live quotes are required before a basket deposit can be signed.",
    creditRequiresSealed:
      "This basket includes a CREDIT allocation, which is only deliverable through the Sealed Relayer. Switch execution privacy to Sealed Relayer to continue.",
    insufficientEth: (balance: string) =>
      `Insufficient ETH. Your connected wallet holds ${balance} ETH on Robinhood Chain.`,
    insufficientUsdg: (balance: string) =>
      `Insufficient USDG. Your connected wallet holds ${balance} USDG on Robinhood Chain.`,
  },

  success: {
    heartbeat: "Heartbeat confirmed! Dead-man's switch deadline extended.",
    depositVerified: "Corpus deposit verified on Robinhood Chain!",
  },

  telegram: {
    title: "Telegram Dead-Man's Switch Alerts",
    desc: "Receive private countdown notifications (30d, 14d, 7d, 24h) and check in with one tap from Telegram.",
    connectButton: "Connect @HeirloomRHBot",
    connecting: "Generating pairing link…",
    connected: "Alerts Active (@HeirloomRHBot)",
    disconnectButton: "Disconnect",
    disconnecting: "Disconnecting…",
    modalTitle: "Connect Telegram Alerts",
    modalDesc:
      "Tap below to open Telegram and pair your trust with @HeirloomRHBot. Your pairing link expires in 1 hour.",
    openBot: "Open in Telegram",
    copyLink: "Copy Link",
    copied: "Link copied!",
    close: "Close",
    checkinBannerTitle: "Telegram Heartbeat Check-In",
    checkinBannerDesc:
      "You opened this vault from an alert in @HeirloomRHBot. Sign below to extend your 90-day window.",
  },

  beneficiaryFallback: "Beneficiary",
  tokenSuffix: " Token",
};
