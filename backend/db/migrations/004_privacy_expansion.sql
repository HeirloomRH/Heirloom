-- Migration 004: Privacy Expansion Schema (H-0 and H-P)

-- 1. Upgrade trusts table with privacy fields & mode
ALTER TABLE trusts
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'public',
ADD COLUMN IF NOT EXISTS terms_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS cipher_terms TEXT,
ADD COLUMN IF NOT EXISTS cipher_letter TEXT,
ADD COLUMN IF NOT EXISTS ladder JSONB;

-- 2. Indexer table for commitments
CREATE TABLE IF NOT EXISTS commitments (
  id SERIAL PRIMARY KEY,
  trust_id TEXT NOT NULL,
  commitment VARCHAR(66) NOT NULL UNIQUE,
  nullifier VARCHAR(66),
  ciphertext TEXT NOT NULL,
  block_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexer table for nullifiers
CREATE TABLE IF NOT EXISTS nullifiers (
  id SERIAL PRIMARY KEY,
  nullifier VARCHAR(66) NOT NULL UNIQUE,
  trust_id TEXT NOT NULL,
  spent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sealed deposit windows table
CREATE TABLE IF NOT EXISTS windows (
  id SERIAL PRIMARY KEY,
  trust_id TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Epoch solvency proofs table
CREATE TABLE IF NOT EXISTS epochs (
  id SERIAL PRIMARY KEY,
  epoch_index INTEGER NOT NULL UNIQUE,
  solvency_proof TEXT NOT NULL,
  total_shielded_usd NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Private trust registry mapping
CREATE TABLE IF NOT EXISTS trusts_private (
  id SERIAL PRIMARY KEY,
  trust_id TEXT NOT NULL UNIQUE,
  vault_address VARCHAR(42) NOT NULL,
  terms_hash VARCHAR(66) NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'private',
  ladder JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Disclosure grants for audited reveals (tax, court, guardians)
CREATE TABLE IF NOT EXISTS disclosures (
  id SERIAL PRIMARY KEY,
  trust_id TEXT NOT NULL,
  grantee_address VARCHAR(42) NOT NULL,
  cipher_key TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- 8. Standing and membership proofs
CREATE TABLE IF NOT EXISTS standing_proofs (
  id SERIAL PRIMARY KEY,
  trust_id TEXT NOT NULL,
  beneficiary_proof TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Anonymity set meters
CREATE TABLE IF NOT EXISTS sets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  meter_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default anonymity set
INSERT INTO sets (name, meter_count)
VALUES ('rhc_mainnet_pool_v1', 1)
ON CONFLICT (name) DO NOTHING;
