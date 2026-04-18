-- Auto-scale rules engine
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_ids TEXT,                    -- JSON array or NULL (all campaigns)
  is_active INTEGER NOT NULL DEFAULT 1,
  condition_metric TEXT NOT NULL,       -- roas, cpa, ctr, spend, conversions, cpc
  condition_operator TEXT NOT NULL,     -- gt, lt, gte, lte, eq
  condition_value REAL NOT NULL,
  condition_period TEXT NOT NULL DEFAULT 'last_7d',
  action_type TEXT NOT NULL,           -- budget_increase, budget_decrease, pause, enable
  action_value REAL NOT NULL,
  action_unit TEXT NOT NULL DEFAULT 'percent', -- percent, fixed
  action_max_budget REAL,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rules_user ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_account ON rules(account_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active);

-- Rule execution log
CREATE TABLE IF NOT EXISTS rule_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  triggered INTEGER NOT NULL DEFAULT 0,
  current_value REAL,
  action_taken TEXT,
  bot_action_id TEXT,
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_rule ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_executions_time ON rule_executions(evaluated_at);
