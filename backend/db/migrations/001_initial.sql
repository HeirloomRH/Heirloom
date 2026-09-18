-- 001_initial.sql: Heirloom core database schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS trusts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_address VARCHAR(42) NOT NULL,
  beneficiary_address VARCHAR(42) NOT NULL,
  vault_address VARCHAR(42),
  name VARCHAR(255) NOT NULL,
  is_revocable BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  heartbeat_window_seconds BIGINT NOT NULL DEFAULT 2592000, -- 30 days default
  last_heartbeat_at TIMESTAMPTZ,
  letter_to_beneficiary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusts_grantor ON trusts(grantor_address);
CREATE INDEX IF NOT EXISTS idx_trusts_beneficiary ON trusts(beneficiary_address);
CREATE INDEX IF NOT EXISTS idx_trusts_vault ON trusts(vault_address);

CREATE TABLE IF NOT EXISTS trust_vesting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  unlock_timestamp TIMESTAMPTZ NOT NULL,
  percentage_bps INTEGER NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vesting_trust_id ON trust_vesting_schedules(trust_id);

CREATE TABLE IF NOT EXISTS trust_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  guardian_address VARCHAR(42) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'guardian',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trust_id, guardian_address)
);

CREATE INDEX IF NOT EXISTS idx_guardians_trust_id ON trust_guardians(trust_id);
CREATE INDEX IF NOT EXISTS idx_guardians_address ON trust_guardians(guardian_address);

CREATE TABLE IF NOT EXISTS trust_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  token_address VARCHAR(42) NOT NULL,
  symbol VARCHAR(30) NOT NULL,
  target_allocation_bps INTEGER NOT NULL,
  drip_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_assets_trust_id ON trust_assets(trust_id);
