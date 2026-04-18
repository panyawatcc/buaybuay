-- Bot actions log — records automated budget changes for audit + undo
CREATE TABLE IF NOT EXISTS bot_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  rule_id TEXT,
  rule_name TEXT,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  action_type TEXT NOT NULL,         -- budget_increase, budget_decrease, pause, enable
  previous_value REAL,
  new_value REAL,
  change_percent REAL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  undone_at TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bot_actions_user ON bot_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_actions_account ON bot_actions(account_id);
CREATE INDEX IF NOT EXISTS idx_bot_actions_executed ON bot_actions(executed_at);
