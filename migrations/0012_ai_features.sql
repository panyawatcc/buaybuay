-- AI features scaffold tables (Phase 4+ follow-up will wire real logic).
-- All tables reference users(id) on delete cascade. Timestamps use datetime('now').

CREATE TABLE IF NOT EXISTS ai_fatigue_detects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  frequency REAL,
  hook_rate REAL,
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_fatigue_user ON ai_fatigue_detects(user_id);

CREATE TABLE IF NOT EXISTS ai_copywriter_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_ad_id TEXT,
  prompt TEXT,
  generated_captions TEXT,             -- JSON array of strings
  new_ad_ids TEXT,                     -- JSON array of created FB ad IDs
  llm_model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_copy_user ON ai_copywriter_logs(user_id);

CREATE TABLE IF NOT EXISTS ai_crm_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,              -- kaojao | page365 | manual
  external_order_id TEXT,
  customer_identifier TEXT,            -- phone or email hashed at app layer
  amount REAL,
  currency TEXT DEFAULT 'THB',
  status TEXT,
  raw_payload TEXT,                    -- JSON for audit
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_crm_user ON ai_crm_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_crm_platform ON ai_crm_orders(platform);

CREATE TABLE IF NOT EXISTS ai_trends_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  source TEXT NOT NULL,                -- x | tiktok | manual
  keyword TEXT NOT NULL,
  score REAL,
  metadata TEXT,                       -- JSON
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_trends_fetched ON ai_trends_log(fetched_at);

CREATE TABLE IF NOT EXISTS ai_ltv_predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_identifier TEXT NOT NULL,
  predicted_ltv REAL,
  repurchase_ready INTEGER NOT NULL DEFAULT 0,
  suggested_upsell TEXT,               -- JSON
  predicted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_ltv_user ON ai_ltv_predictions(user_id);
