-- 002_vault_engine.sql: Dedicated Vault Wallets & Execution Tracking

CREATE SEQUENCE IF NOT EXISTS vault_index_seq START 1;

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS vault_index INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS heartbeat_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS corpus_funded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS creation_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS creation_fee_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS encrypted_letter TEXT,
  ADD COLUMN IF NOT EXISTS terms_json JSONB;

CREATE INDEX IF NOT EXISTS idx_trusts_vault_index ON trusts(vault_index);
CREATE INDEX IF NOT EXISTS idx_trusts_status ON trusts(status);
CREATE INDEX IF NOT EXISTS idx_trusts_heartbeat_deadline ON trusts(heartbeat_deadline);

-- Heartbeat audit log
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  grantor_address VARCHAR(42) NOT NULL,
  signature TEXT NOT NULL,
  signed_timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_trust_id ON heartbeat_logs(trust_id);

-- Vesting and succession claims
CREATE TABLE IF NOT EXISTS vesting_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES trust_vesting_schedules(id) ON DELETE SET NULL,
  beneficiary_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(30) NOT NULL,
  amount_atomic TEXT NOT NULL,
  amount_formatted TEXT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_trust_id ON vesting_claims(trust_id);
CREATE INDEX IF NOT EXISTS idx_claims_beneficiary ON vesting_claims(beneficiary_address);
