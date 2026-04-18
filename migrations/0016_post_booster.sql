-- 0016_post_booster.sql
-- Post Booster Phase 1: page token storage + boost jobs + per-post runs.
-- Spec: ~/shared/post-booster-spec.md §2.

-- 1) Page tokens — encrypted FB page access tokens cached from /me/accounts
--    during OAuth callback. Avoids re-fetching on every /pages call.
--    Encryption uses the same TOKEN_ENCRYPTION_KEY as users.fb_token.
CREATE TABLE IF NOT EXISTS page_tokens (
  user_id         TEXT NOT NULL,
  page_id         TEXT NOT NULL,
  page_name       TEXT,
  fan_count       INTEGER,
  token_encrypted TEXT NOT NULL,           -- encrypted with TOKEN_ENCRYPTION_KEY
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, page_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_page_tokens_user ON page_tokens(user_id);

-- 2) Post Booster jobs — one row per wizard launch.
CREATE TABLE IF NOT EXISTS post_booster_jobs (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  account_id            TEXT NOT NULL,
  page_ids_json         TEXT NOT NULL,     -- JSON array of FB page IDs
  keyword               TEXT NOT NULL,
  match_mode            TEXT NOT NULL,     -- contains | exact | ai_semantic
  filters_json          TEXT NOT NULL,     -- {date_range, min_engagement, post_types[]}
  targeting_json        TEXT NOT NULL,     -- {regions, lal_preset, age_min, age_max, gender, ...}
  budget_per_day        REAL NOT NULL,
  duration_days         INTEGER NOT NULL,
  copywriter_enabled    INTEGER NOT NULL DEFAULT 0,
  fb_campaign_id        TEXT,
  fb_adset_id           TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',  -- draft|active|paused|completed|error
  error_message         TEXT,
  launched_at           TEXT,
  completed_at          TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pbj_user_status ON post_booster_jobs(user_id, status, created_at DESC);

-- 3) Post Booster runs — one row per post boosted (or attempted).
CREATE TABLE IF NOT EXISTS post_booster_runs (
  id                       TEXT PRIMARY KEY,
  job_id                   TEXT NOT NULL,
  original_post_id         TEXT NOT NULL,                     -- page_id_post_id
  boosted_post_id          TEXT,                              -- same as original if !copywriter
  copywriter_generation_id TEXT,                              -- nullable FK to ai_copywriter_logs
  fb_ad_id                 TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending',   -- pending|launched|failed
  error_message            TEXT,
  spend_to_date            REAL DEFAULT 0,
  launched_at              TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES post_booster_jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pbr_job  ON post_booster_runs(job_id, status);
CREATE INDEX IF NOT EXISTS idx_pbr_post ON post_booster_runs(original_post_id);
