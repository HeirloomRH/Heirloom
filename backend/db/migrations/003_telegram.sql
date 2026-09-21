-- Telegram Bot integration for dead-man's switch alerts and heartbeat check-ins

ALTER TABLE trusts
  ADD COLUMN IF NOT EXISTS telegram_chat_id        BIGINT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_alerts_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_pairing_token  VARCHAR(64)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_pairing_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_linked_at      TIMESTAMPTZ   DEFAULT NULL,
  -- Track which alert thresholds have been sent to avoid duplicates
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_30d BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_14d BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_7d  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_alert_sent_24h BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trusts_telegram_chat_id ON trusts(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trusts_pairing_token ON trusts(telegram_pairing_token)
  WHERE telegram_pairing_token IS NOT NULL;

-- Reset alert sent flags whenever heartbeat is refreshed
-- (handled in application logic via UPDATE ... SET telegram_alert_sent_*d = FALSE)
