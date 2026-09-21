-- 006_stake_module.sql: ORBIO staking — the inference-yielding corpus
--
-- The Orbio Staking contract itself is the source of truth for how much a
-- vault has staked (positionOf) — these tables only track which trusts have
-- opted in, so the claim worker knows who to poll, and log the claim history.

CREATE TABLE IF NOT EXISTS trust_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  staked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_claim_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trust_id)
);

CREATE INDEX IF NOT EXISTS idx_trust_stakes_active ON trust_stakes(trust_id) WHERE active = TRUE;

-- Audit log / receipts for both explicit stake/unstake actions and the
-- claim worker's hourly sweeps.
CREATE TABLE IF NOT EXISTS stake_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL, -- stake | unstake | claim
  amount_atomic TEXT NOT NULL, -- ORBIO for stake/unstake, CREDIT for claim
  tx_hash VARCHAR(66),
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stake_events_trust_id ON stake_events(trust_id);
