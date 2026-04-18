-- 0019_admin_fb_tokens_history.sql
-- Immutable audit trail for admin_fb_tokens — GUARD F4-1 (Nothing-Deleted compliance).
--
-- Problem: admin_fb_tokens enforces 1-row-per-admin via UNIQUE(admin_user_id) and
-- rotation happens via ON CONFLICT DO UPDATE (see functions/api/ai/post-booster/_lib/page-token.ts
-- and functions/api/dev/admin-token-set.ts). The UPDATE overwrites fb_token_encrypted
-- in place — the previous ciphertext is permanently lost. GUARD flagged this as a
-- Nothing-Deleted violation (2026-04-17 rotation verify report § F4-1).
--
-- Solution: history table + AFTER INSERT/UPDATE/DELETE triggers that snapshot the
-- OLD (pre-change) state of any mutation. Backfill seeds the current state so
-- nothing that already exists is lost before the next rotation.
--
-- Semantics of `action` column:
--   'create'   — AFTER INSERT trigger; snapshot = NEW (row just created)
--   'rotate'   — AFTER UPDATE trigger; snapshot = OLD (pre-update state)
--   'revoke'   — AFTER DELETE trigger; snapshot = OLD (pre-delete state)
--   'backfill' — one-time seed at this migration; snapshot = current row
--
-- changed_by: trigger-generated rows use 'trigger:auto'. Application code that
-- wants to attribute a specific actor can insert an extra audit-log row elsewhere
-- (e.g., a request-scoped audit table) — this table is strictly row-state history.

-- 1) History table
CREATE TABLE IF NOT EXISTS admin_fb_tokens_history (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id      TEXT NOT NULL,
  fb_token_encrypted TEXT NOT NULL,                         -- AES ciphertext snapshot
  scope_granted      TEXT,
  fb_user_id         TEXT,
  expires_at         INTEGER,
  action             TEXT NOT NULL CHECK(action IN ('create','rotate','revoke','backfill')),
  changed_at         TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by         TEXT NOT NULL DEFAULT 'trigger:auto'
);

CREATE INDEX IF NOT EXISTS idx_afth_admin_time
  ON admin_fb_tokens_history(admin_user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_afth_action
  ON admin_fb_tokens_history(action);

-- 2) Triggers — immutable audit on every mutation of admin_fb_tokens

CREATE TRIGGER IF NOT EXISTS trg_afth_insert
AFTER INSERT ON admin_fb_tokens
BEGIN
  INSERT INTO admin_fb_tokens_history
    (admin_user_id, fb_token_encrypted, scope_granted, fb_user_id, expires_at, action)
  VALUES
    (NEW.admin_user_id, NEW.fb_token_encrypted, NEW.scope_granted, NEW.fb_user_id, NEW.expires_at, 'create');
END;

CREATE TRIGGER IF NOT EXISTS trg_afth_update
AFTER UPDATE ON admin_fb_tokens
BEGIN
  INSERT INTO admin_fb_tokens_history
    (admin_user_id, fb_token_encrypted, scope_granted, fb_user_id, expires_at, action)
  VALUES
    (OLD.admin_user_id, OLD.fb_token_encrypted, OLD.scope_granted, OLD.fb_user_id, OLD.expires_at, 'rotate');
END;

CREATE TRIGGER IF NOT EXISTS trg_afth_delete
AFTER DELETE ON admin_fb_tokens
BEGIN
  INSERT INTO admin_fb_tokens_history
    (admin_user_id, fb_token_encrypted, scope_granted, fb_user_id, expires_at, action)
  VALUES
    (OLD.admin_user_id, OLD.fb_token_encrypted, OLD.scope_granted, OLD.fb_user_id, OLD.expires_at, 'revoke');
END;

-- 3) Backfill — preserve current state as the first snapshot.
-- Using 'backfill' + 'migration:0019' so these rows are distinguishable from
-- trigger-generated ones. Safe to re-run: INSERT SELECT is idempotent only if
-- the source admin_fb_tokens is unchanged; since migrations apply once per D1
-- (tracked in d1_migrations), double-apply is prevented anyway.
INSERT INTO admin_fb_tokens_history
  (admin_user_id, fb_token_encrypted, scope_granted, fb_user_id, expires_at, action, changed_by)
SELECT
  admin_user_id, fb_token_encrypted, scope_granted, fb_user_id, expires_at, 'backfill', 'migration:0019'
FROM admin_fb_tokens;
