-- 0013_ai_copywriter_hardening.sql
-- Week 1 GUARD Gate 1 requirements (spec: guard-week1-security-spec-v2-cf §1.4).
-- 1) Remove raw prompt from ai_copywriter_logs (PII hardening).
-- 2) Add llm_audit_log for cost-cap circuit breaker.
-- 3) Add llm_counters for atomic rate/cost tracking.
-- 4) Add line_events for webhook idempotency.

-- ─── 1. Strip PII from ai_copywriter_logs ───
-- D1 (SQLite >= 3.35) supports ALTER TABLE DROP COLUMN directly.
ALTER TABLE ai_copywriter_logs ADD COLUMN prompt_hash TEXT;
-- Nullify any pre-existing prompt rows. Do NOT back-compute hashes from existing
-- prompts — that preserves content-searchability of pre-fix PII. Old rows stay
-- NULL; PII stops growing from here.
UPDATE ai_copywriter_logs SET prompt_hash = NULL WHERE prompt IS NOT NULL;
ALTER TABLE ai_copywriter_logs DROP COLUMN prompt;

-- ─── 2. llm_audit_log — every LLM call (blocked or successful) ───
CREATE TABLE IF NOT EXISTS llm_audit_log (
  id                 TEXT PRIMARY KEY,                    -- UUID
  user_id            TEXT,                                 -- nullable for system calls
  feature            TEXT NOT NULL,                        -- 'copywriter' | 'crm-reply' | etc.
  model              TEXT NOT NULL,
  request_id         TEXT NOT NULL UNIQUE,                 -- idempotency key
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd_micro     INTEGER NOT NULL DEFAULT 0,           -- cost * 1e6
  latency_ms         INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL,                        -- 'success' | 'blocked_cap' | 'blocked_kill' | 'error'
  block_reason       TEXT,
  prompt_hash        TEXT NOT NULL,                        -- SHA256 hex — NEVER store raw prompt
  error_code         TEXT,
  ip_address         TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_llm_audit_user_time ON llm_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_audit_time ON llm_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_audit_status ON llm_audit_log(status);

-- ─── 3. llm_counters — atomic counters for rate/cost caps ───
-- SQLite UPSERT gives atomic increment with RETURNING in a single round-trip.
CREATE TABLE IF NOT EXISTS llm_counters (
  key            TEXT PRIMARY KEY,                          -- e.g. 'user:123:hour:471234' | 'global:day:2026-04-17'
  count          INTEGER NOT NULL DEFAULT 0,
  cost_usd_micro INTEGER NOT NULL DEFAULT 0,
  expires_at     INTEGER NOT NULL                           -- unix seconds — cleanup column
);
CREATE INDEX IF NOT EXISTS idx_llm_counters_expires ON llm_counters(expires_at);

-- ─── 4. line_events — webhook idempotency ───
CREATE TABLE IF NOT EXISTS line_events (
  webhook_event_id TEXT PRIMARY KEY,
  destination      TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  payload          TEXT NOT NULL,                           -- JSON
  processed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_line_events_dest_time ON line_events(destination, processed_at);

-- ─── 5. Expired counter cleanup (run via cron) ───
-- Schedule `DELETE FROM llm_counters WHERE expires_at < unixepoch()` hourly
-- via cron endpoint (not part of this migration).
