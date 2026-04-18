-- Telegram bot connections per user
CREATE TABLE IF NOT EXISTS telegram_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL UNIQUE,
  bot_token_encrypted TEXT NOT NULL,
  bot_username TEXT,
  chat_id TEXT,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_user ON telegram_connections(user_id);

-- Extend notification_settings with telegram + push granular fields
ALTER TABLE notification_settings ADD COLUMN telegram_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_settings ADD COLUMN telegram_daily_summary INTEGER DEFAULT 1;
ALTER TABLE notification_settings ADD COLUMN push_alerts INTEGER DEFAULT 1;
ALTER TABLE notification_settings ADD COLUMN push_daily_summary INTEGER DEFAULT 0;
