-- 008_grace_period_alerts.sql: countdown reminders during the 28-day grace period

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_14d BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_7d  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_grace_24h BOOLEAN NOT NULL DEFAULT FALSE;
