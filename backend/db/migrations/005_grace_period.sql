-- Migration 005: 28-Day Succession Grace Period

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS grace_period_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_start BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_14d   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_7d    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_24h   BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trusts_grace_period_deadline ON trusts(grace_period_deadline);
