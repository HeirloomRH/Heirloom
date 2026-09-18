# Contributing to Heirloom

Thank you for your interest in contributing to **Heirloom ($HEIR)**.

Heirloom is the first on-chain trust fund for tokenized stocks on Robinhood Chain (Chain ID: `4663`). To ensure code reliability, security, and consistent architecture, please adhere to the following guidelines.

---

## What Contributions Are Wanted Right Now

We are currently focused on **Phase H1: Trust Builder & Core Vaults**. High-priority areas include:

- **Frontend / UX:**
  - Trust creation wizard enhancements (corpus builder, vesting schedule visualization).
  - Trust dashboard interface ("the screenshot surface") and letter-to-beneficiary editor.
  - Interactive vesting timeline graphs and countdown clocks.
  - Wallet connection handling for Robinhood Chain.
- **Backend Services:**
  - Robust heartbeat monitoring service for the dead-man's switch.
  - PostgreSQL database query optimization and event indexing helpers.
  - Additional endpoint integration tests using Bun + Supertest.
- **Documentation & Testing:**
  - Mock tokenized stock contract fixtures and end-to-end test scenarios.

## What Is Out of Scope (For Now)

- Implementing custom secondary automated market makers (AMMs) or swapping routers.
- Unaudited smart contract core architecture changes.
- Multi-generation recursive chaining (scheduled for Phase H3).
- Shielded/zero-knowledge privacy rails (scheduled for Phase H4).

---

## Local Setup

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v20+)
- [PostgreSQL](https://www.postgresql.org) (v15+)

### Clone and Install
```bash
git clone https://github.com/notadeveloper7/heirloom.git
cd heirloom

# Install frontend dependencies
bun install

# Install backend dependencies
cd backend
bun install
cp .env.example .env
cd ..
```

### Running Checks
```bash
# Frontend typecheck & lint
bun run lint

# Backend typecheck & tests
cd backend
bun run check
bun test
```

---

## Workflow

1. **Fork & Branch:** Create a branch prefixed with your feature/fix type:
   - `feat/<feature-name>`
   - `fix/<bug-summary>`
   - `docs/<doc-update>`
2. **Make Changes:** Keep PRs atomic. Focus on one concern per pull request.
3. **Run Tests:** Ensure `bun run check` and `bun test` in `/backend` pass without warnings or errors.
4. **Submit PR:** Open a Pull Request targeting the `main` branch. Provide a clear summary and screenshots for any UI updates.

---

## Pull Request Guidelines

- **One concern per PR:** Do not bundle unrelated refactors, styling updates, and bug fixes into a single PR.
- **Test coverage:** Every new API route or business logic addition in the backend must include corresponding tests in `backend/tests/`.
- **Architectural discussions:** Any major protocol architecture changes must be proposed in a GitHub Discussion or Issue before submitting code.
- **Commit Style:** Use concise, imperative present-tense messages in plain English:
  - Good: `add heartbeat deadline calculation helper`
  - Good: `fix allowance stream balance overflow check`
  - Avoid: `fixed stuff`, `wip`, `updated backend`

---

## Bug Reporting Format

When submitting an issue, include:
1. **Context:** What environment were you running (local dev, testnet, browser, node/bun version)?
2. **Action Taken:** Exact steps taken to trigger the behavior.
3. **Observed Behavior:** What actually happened (include logs or console outputs).
4. **Expected Behavior:** What should have happened.
5. **Reproduction Snippet:** Minimal code or curl command to reproduce the issue.

---

## Security Vulnerabilities

Please **do not** open public GitHub issues for security vulnerabilities. Instead, refer to our [Security Policy](SECURITY.md) and report directly to **heirloomrh@outlook.com**.
