# HEIRLOOM ($HEIR)

[![CI](https://github.com/HeirloomRH/Heirloom/actions/workflows/backend.yml/badge.svg)](https://github.com/HeirloomRH/Heirloom/actions/workflows/backend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Robinhood Chain](https://img.shields.io/badge/Robinhood_Chain-4663-00C805?logo=ethereum&logoColor=white)

**$HEIR Contract Address** — Robinhood Chain (4663)

```text
0xa6e6a94208a481fa73e5083d8e54c01f7a7e04ed
```

[View on DexScreener](https://dexscreener.com/search?q=0xa6e6a94208a481fa73e5083d8e54c01f7a7e04ed)

> **The on-chain trust fund. Generational wealth, programmable.**

The wealthy don't hand their kids cash — they set up trusts: portfolios that vest on schedules, pay allowances, and survive the person who created them. That machinery traditionally costs lawyers, banks, and five figures a year. **HEIRLOOM** turns this into a five-minute on-chain flow: build a portfolio of real tokenized stocks, seal it in a non-custodial trust vault, and program exactly how and when it reaches the people you love — vesting birthdays, monthly allowances, education unlocks, and an automated dead-man's switch.

---

## Core Features

| Feature | Description | On-Chain Execution |
| :--- | :--- | :--- |
| **Trust Vaults** | Isolated vaults for tokenized stocks & ETFs with USDG or native asset funding. | Non-custodial vault contracts |
| **Vesting Cliffs** | Multi-stage age/milestone unlocks (e.g. 25% at 18, 25% at 21, remainder at 25). | Immutable schedule executor |
| **Dead-Man's Switch** | Configurable heartbeat check-ins; succession plan triggers automatically upon missed window. | Heartbeat timestamp checks |
| **Bounded Guardians** | Optional guardian wallets (family or k-of-n multi-sig) to pause or verify unlocks. | Strictly bounded; cannot redirect corpus |
| **Corporate Action Drip** | Stock splits, dividends, and multipliers compound directly into the corpus. | Native RHC multiplier mechanics |
| **Beneficiary Letter** | Immutable or encrypted personal grantor letter attached to the trust dashboard. | Trust metadata / IPFS / DB |

---

## How It Works

```
[ Grantor ]
     │
     ▼
1. Build Corpus ───────► Select tokenized stocks/ETFs + optional DCA drip
     │
     ▼
2. Define Terms ───────► Set beneficiary address, vesting cliffs, & allowances
     │
     ▼
3. Configure Safety ───► Set dead-man's switch heartbeat & optional guardians
     │
     ▼
4. Seal Trust ─────────► Revocable or Irrevocable smart contract deployment
     │
     ▼
[ Beneficiary ] ◄────── Automated distributions per code schedule
```

1. **Build the Corpus:** Select eligible tokenized stocks/ETFs (registry-gated) or preset blue-chip baskets, funded with USDG or native assets.
2. **Write the Terms:** Specify beneficiary wallets, vesting cliffs, and allowance streams in plain English, executed in code.
3. **Dead-Man's Switch:** Configure heartbeat intervals; if the grantor stops checking in, succession executes without probate or lawyers.
4. **Guardians & Oversight:** Family guardians can approve milestone unlocks or pause anomalies without ever having the ability to steal or redirect assets.
5. **Growth & Distribution:** Corporate actions accrue automatically via on-chain multipliers while distributions stream according to schedule.

---

## Protocol Roles

| Participant | Role | Objective / Reward |
| :--- | :--- | :--- |
| **Grantor** | Creates and funds the trust | Generational wealth secured by code for ~$3 |
| **Beneficiary** | Receives assets per schedule | Transparent, self-custodied portfolio from day one |
| **Guardian** | Bounded oversight | Family trust governance without family drama |
| **$HEIR Staker**| Backs protocol parameters | Share of creation fees + AUM management fees |

---

## API Endpoints (Backend)

The backend service runs on Bun + Express and handles trust indexing, off-chain heartbeat tracking, and metadata caching.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status and basic information |
| `GET` | `/health` | Service health, version, and ISO timestamp |

---

## Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── backend.yml     # Automated CI/CD (Test, Build/Push, Release, Deploy)
├── app/ & src/             # Frontend application (TanStack Start, React 19, Tailwind)
│   ├── routes/             # File-based routing (__root, index, create, vault, app, docs)
│   ├── components/         # UI components & Radix primitives
│   └── lib/                # Utility helpers & state hooks
├── backend/                # Bun + Express backend service
│   ├── src/
│   │   ├── app.ts          # Express application setup
│   │   ├── index.ts        # Server entrypoint with DB migrations
│   │   ├── routes/         # API routes (health check, trust endpoints)
│   │   └── db/             # pg connection pool & migration runner
│   ├── db/migrations/      # SQL schema migrations
│   ├── tests/              # Health and endpoint unit tests
│   ├── Dockerfile          # Multi-stage Bun Alpine production image
│   └── package.json        # Backend dependencies & scripts
├── public/                 # Static assets
└── technical-docs/         # Project specifications and architecture docs
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v20+)
- [PostgreSQL](https://www.postgresql.org) (v15+)

### 1. Frontend Development

```bash
# Install root dependencies
bun install   # or npm install

# Start development server
bun run dev

# Frontend runs by default at http://localhost:5173 or http://localhost:3000
```

### 2. Backend Development

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install backend dependencies
bun install

# Run type check and tests
bun run check
bun test

# Start local server with hot reloading
bun run dev
# Backend runs at http://localhost:3001
```

---

## Deployment Guide

### Frontend (Vercel)
- **Framework Preset:** Vite / TanStack Start
- **Build Command:** `bun run build` (or `npm run build`)
- **Output Directory:** `dist`
- **Environment Variables:** Set `VITE_API_URL`, `VITE_ROBINHOOD_CHAIN_ID=4663`, `VITE_ROBINHOOD_RPC_URL`.

### Backend (Render Web Service — Git Repository Deployment)
When deploying the backend directly from this repository to Render (Native Node/Bun Environment):

| Setting | Value |
| :--- | :--- |
| **Root Directory** | `backend` |
| **Environment** | `Node` or `Bun` |
| **Build / Install Command** | `bun install` |
| **Start Command** | `bun run start` |

**Required Environment Variables in Render:**
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render's internal port)
- `DATABASE_URL`: Connection string to your managed PostgreSQL database (e.g. Render Postgres or Supabase)

---

## Roadmap

| Phase | Milestone | Focus Areas |
| :--- | :--- | :--- |
| **H1** | **Trust Builder & Core Vaults** | Trust creation flow, vesting/cliff schedules, dead-man's switch, trust dashboard ("the screenshot surface"), thin vault contracts. |
| **H2** | **Streams & Multi-sig Guardians** | Allowance streams (USDG / in-kind stock), guardian multi-sig attestation, milestone unlocks. |
| **H3** | **$HEIR Genesis & Chaining** | Protocol governance token, premium tiers, multi-generation trust chaining ("this trust births three trusts"). |
| **H4** | **Confidential Mode** | Shielded corpus via privacy rails, zero-knowledge attestation proofs. |

---

## Tech Stack

- **Target Chain:** Robinhood Chain (Chain ID: `4663`)
- **Frontend:** React 19, TanStack Start / React Router, Vite, Tailwind CSS, Radix UI, GSAP
- **Backend:** Bun 1.x, Express, TypeScript, PostgreSQL (`pg`)
- **CI/CD:** GitHub Actions, GitHub Packages (GHCR), Render Deploy Hook

---

## Security

Please report vulnerabilities directly to **heirloomrh@outlook.com**. See [SECURITY.md](SECURITY.md) for vulnerability disclosure policies and specific threat vectors.

---

## License

This project is licensed under the [MIT License](LICENSE).
