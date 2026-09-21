-- 007_succession_ai_grant.sql: Succession includes AI
--
-- On lapse (succession_triggered), a trust with a configured budget gets a
-- one-time activated CREDIT grant to the successor's key — for settling
-- affairs, running the estate's agent. Executed once, automatically, by
-- heartbeatWorker.ts's existing succession-trigger phase.

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS succession_ai_budget_usdg_atomic TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS succession_ai_granted_at TIMESTAMPTZ DEFAULT NULL;

-- Receipt / audit log, mirrors inference_releases.
CREATE TABLE IF NOT EXISTS succession_ai_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  successor_address VARCHAR(42) NOT NULL,
  usdg_spent_atomic TEXT NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- confirmed | deferred_thin_book | deferred_insufficient_funds | failed
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_succession_ai_grants_trust_id ON succession_ai_grants(trust_id);
