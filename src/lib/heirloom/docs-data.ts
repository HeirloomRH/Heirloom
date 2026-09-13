export const articles = [
  {
    id: "preview",
    title: "Start here: the frontend preview",
    tag: "GETTING STARTED",
    text: "This site is an interactive demonstration of Heirloom. Create a demo trust, choose illustrative allocations, write a release schedule, and save it in this browser. No funds are held. No wallet is authenticated, and no smart contract is called.",
    extra:
      "Saved demos are local to this browser and device. Clearing site storage removes them. Export a JSON demo plan from a trust page to keep a copy; export includes the beneficiary wallet and letter. Exported plans cannot be imported through this version. Sample trust changes reset on reload.",
  },
  {
    id: "vaults",
    title: "The vault: a portfolio with a purpose",
    tag: "CORE CONCEPT",
    text: "A Heirloom vault is intended to hold a portfolio under explicit distribution rules. The creator sets the beneficiaries and terms. The production system must enforce those terms in verified smart contracts.",
    extra:
      "The frontend supports one beneficiary per demo trust, a basket of sample assets, and up to six scheduled releases. Multiple beneficiaries, asset deposits, monthly contributions, and real balances are future integration work.",
  },
  {
    id: "portfolio",
    title: "Stock Tokens & eligibility",
    tag: "THE FOUNDATION",
    text: "The product is designed around eligible tokenized stocks and ETFs. The frontend asset list is illustrative; it is not a verified asset registry or an offer to acquire any asset.",
    extra:
      "Robinhood describes Stock Tokens as tokenised debt securities providing economic exposure to underlying securities, without legal or beneficial ownership rights in those underlying securities. Production access must check jurisdiction, participant eligibility, token registry status, and current issuer restrictions.",
    source: "https://docs.robinhood.com/chain/stock-tokens/",
    sourceLabel: "Robinhood Stock Token documentation",
  },
  {
    id: "schedules",
    title: "Vesting & release schedules",
    tag: "YOUR TERMS",
    text: "Choose future release dates and the percentage assigned to each date. The percentages must total 100%, and dates must run in chronological order. A 25% / 25% / 50% schedule refers to the original allocation, not the remaining portfolio.",
    extra:
      "The demo stores dates and allocation percentages; it does not release assets. Production needs a precise timezone policy, deterministic token-unit allocation, rounding rules, a distribution executor, finality handling, and protection against repeated execution.",
  },
  {
    id: "heartbeat",
    title: "Heartbeats & succession",
    tag: "CONTINUITY",
    text: "A heartbeat is a periodic check-in from the creator. The intended design uses an elapsed check-in window and a grace period to activate a predefined succession plan.",
    extra:
      "In this preview, “I’m here” only updates a local timestamp. Missed check-ins do not trigger a transfer. Production requires an agreed grace period, secure notifications, ownership proof, and independently verified execution. A missed check-in is not legal proof of death.",
  },
  {
    id: "guardians",
    title: "Guardians, with boundaries",
    tag: "PEOPLE & PERMISSIONS",
    text: "A guardian is a named wallet intended to provide bounded oversight. Proposed powers include pausing distributions and attesting milestones. Guardians are not intended to redirect the portfolio.",
    extra:
      "This preview records an optional guardian address. It does not authenticate that wallet, implement multisignature approvals, or execute milestone attestations. The production contracts must enumerate and enforce every permission.",
  },
  {
    id: "modes",
    title: "Revocable & irrevocable terms",
    tag: "A DELIBERATE CHOICE",
    text: "Revocable mode is designed to preserve a creator’s ability to revoke under the final contract policy. Irrevocable mode is designed to remove that ability after sealing. Choose deliberately.",
    extra:
      "The builder asks for a typed IRREVOCABLE acknowledgement before saving that demo mode. This is an educational acknowledgement; no vault is sealed. Even a demo marked irrevocable can be removed from local storage, because it is only a local plan.",
  },
  {
    id: "letters",
    title: "The letter only you can write",
    tag: "PERSONAL INTENT",
    text: "Add an optional letter to tell the beneficiary why you started. It appears on the trust’s Letter tab and is included in a downloaded demo plan.",
    extra:
      "Letters in this frontend are plain text in browser storage. They are not encrypted or private from people who can access this browser. Do not enter secrets or sensitive personal information. Encrypted storage, key recovery, and beneficiary delivery require production implementation.",
  },
  {
    id: "network",
    title: "Designed for Robinhood Chain",
    tag: "NETWORK",
    text: "The intended network is Robinhood Chain. Official documentation identifies mainnet chain ID 4663 and testnet chain ID 46630, using ETH for gas.",
    extra:
      "The frontend does not request a wallet connection. No verified Heirloom vault address, ABI, token contract, or deployment was supplied. Network support alone does not establish that Heirloom is deployed or endorsed by Robinhood.",
    source: "https://docs.robinhood.com/chain/connecting/",
    sourceLabel: "Official network configuration",
  },
  {
    id: "boundaries",
    title: "Risks & honest boundaries",
    tag: "READ BEFORE USING",
    text: "Heirloom describes programmable custody rules, not a statutory legal trust. This frontend is not legal, tax, or investment advice. Estate planning can require appropriate professional support and jurisdiction-specific arrangements.",
    extra:
      "Production risks include loss of capital, issuer and counterparty risk, smart-contract defects, compromised keys, inaccurate data, unavailable services, and irreversible transactions. No return, fee, availability, security audit, or perpetual execution is guaranteed by this preview. Market values may fall. Eligibility is not checked here.",
  },
  {
    id: "token",
    title: "The planned $HEIR token",
    tag: "ROADMAP",
    text: "The product brief includes a future protocol token, premium features, and potential protocol fee mechanisms. Commercial policies and contract configuration remain unresolved.",
    extra:
      "There is no token purchase or staking flow in this frontend. No token contract or reward rate is verified. The roadmap is a product plan, not a release-date or investment commitment.",
  },
];
