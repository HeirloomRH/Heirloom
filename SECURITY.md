# Security Policy

At **Heirloom**, safeguarding generational wealth and ensuring the integrity of programmable trust vaults is our utmost priority. We appreciate the work of independent security researchers and white-hats in discovering and responsibly disclosing vulnerabilities.

---

## Reporting a Vulnerability

**DO NOT create public GitHub issues or discuss potential vulnerabilities publicly.**

To report a security issue, email:
✉️ **heirloomrh@outlook.com**

Please include in your report:
1. A detailed explanation of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a Proof of Concept (PoC).
3. Any affected contract functions, endpoints, or dependencies.
4. Your PGP key (optional) if you prefer encrypted communication.

---

## Response Timeline

We commit to the following response targets for valid submissions:

| Phase | Target Timeline |
| :--- | :--- |
| **Initial Acknowledgment** | Within **48 hours** |
| **Triage & Severity Assessment** | Within **3 business days** |
| **Critical Fix / Mitigation** | Within **7 days** |
| **Public Disclosure / Advisory** | Coordinated after patch deployment |

---

## Safe Harbor & Reporter Expectations

We pledge that Heirloom will **not pursue legal action** against security researchers who:
- Act in good faith to avoid privacy violations, data destruction, and service disruption.
- Only interact with test accounts or self-deployed contract instances during testing.
- Give our team adequate time to remediate the vulnerability before public disclosure.
- Do not exploit the vulnerability beyond what is strictly necessary to demonstrate the issue.

Researchers providing actionable, high-quality disclosures will be credited in our release notes and hall of fame.

---

## Scope

### In Scope
- Core trust vault contracts (`Vault`, `ScheduleExecutor`) once deployed.
- Backend API endpoints and heartbeat tracking logic.
- Vesting and cliff distribution algorithms.
- Permission enforcement between Grantor, Beneficiary, and Guardian.

### Out of Scope
- Social engineering, phishing, or physical attacks against team members.
- Denial of Service (DoS) attacks on publicly available infrastructure.
- Issues related to third-party RPC endpoints or upstream Robinhood Chain node infrastructure.

---

## Project-Specific Attack Surfaces

Given Heirloom's non-custodial trust vault and dead-man's switch architecture, we closely monitor and emphasize protections against:

1. **Dead-Man's Switch Griefing & False Triggers:**
   Attempts to prevent a grantor from checking in (e.g., front-running, gas manipulation) or artificially accelerating heartbeat deadlines to execute premature succession.
2. **Guardian Privilege Escalation:**
   Attempts by bounded guardians to exceed their restricted capabilities (e.g., trying to redirect vault corpus or claim unauthorized ownership).
3. **Oracle & Multiplier Price Manipulation:**
   Attacking on-chain Chainlink × multiplier feeds or pricing oracles for tokenized stocks to misprice corpus valuations during distribution or liquidation events.
4. **Vesting & Allowance Reentrancy / Double-Claiming:**
   Exploiting edge cases in milestone unlock attestations or allowance streaming math to double-claim tokens before state updates are persisted.
5. **Irrevocable Mode Override Attempts:**
   Circumventing immutability flags to allow grantors to reclaim assets from sealed irrevocable trusts.

---

## Deployed Contracts

*Contracts are currently in active design and will be listed below upon deployment to Robinhood Chain testnet and mainnet.*

| Contract | Network | Address |
| :--- | :--- | :--- |
| `TrustVaultFactory` | RHC Testnet (4663) | *TBD* |
| `ScheduleExecutor` | RHC Testnet (4663) | *TBD* |
