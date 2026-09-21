-- 005_grace_period.sql: 28-day succession grace period and alerts

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS grace_period_deadline TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trusts_grace_period ON trusts(grace_period_deadline)
  WHERE grace_period_deadline IS NOT NULL;
