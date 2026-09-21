-- 005_inference_leg.sql: CREDIT inheritance — recurring activated-inference allowances
--
-- A grantor seals a USDG allowance for AI inference; the inference-release
-- worker spends it down on a cadence via Orbio's buyAndActivate, crediting
-- the beneficiary's own Orbio API balance directly (never a transferable
-- token in their wallet).

-- Beneficiary's registered Orbio activation key. Optional: if a beneficiary
-- never registers one, buyAndActivate falls back to bytes32(uint256(uint160(
-- beneficiary_address))) — their own wallet address is the default key.
CREATE TABLE IF NOT EXISTS beneficiary_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  beneficiary_address VARCHAR(42) NOT NULL,
  key_hash VARCHAR(66) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trust_id, beneficiary_address)
);

CREATE INDEX IF NOT EXISTS idx_beneficiary_keys_trust_id ON beneficiary_keys(trust_id);

-- One row per configured inference allowance. total_remaining_atomic decrements
-- on every successful release; the schedule deactivates itself at zero.
CREATE TABLE IF NOT EXISTS inference_release_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  beneficiary_address VARCHAR(42) NOT NULL,
  usdg_per_cycle_atomic TEXT NOT NULL,
  cadence_days INTEGER NOT NULL,
  next_release_at TIMESTAMPTZ NOT NULL,
  total_remaining_atomic TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inference_schedules_trust_id ON inference_release_schedules(trust_id);
CREATE INDEX IF NOT EXISTS idx_inference_schedules_due ON inference_release_schedules(next_release_at) WHERE active = TRUE;

-- Audit log / receipts, one row per executed (or deferred) release attempt.
CREATE TABLE IF NOT EXISTS inference_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES inference_release_schedules(id) ON DELETE SET NULL,
  beneficiary_address VARCHAR(42) NOT NULL,
  usdg_spent_atomic TEXT NOT NULL,
  credit_activated_atomic TEXT,
  tx_hash VARCHAR(66),
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- confirmed | deferred_thin_book | deferred_insufficient_funds | failed
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inference_releases_trust_id ON inference_releases(trust_id);
CREATE INDEX IF NOT EXISTS idx_inference_releases_schedule_id ON inference_releases(schedule_id);

-- Quote history, for the orbio-quote-watcher pattern and general audit trail.
CREATE TABLE IF NOT EXISTS orbio_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usdg_in_atomic TEXT NOT NULL,
  credit_out_atomic TEXT NOT NULL,
  discount_bps INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orbio_quotes_created_at ON orbio_quotes(created_at);
