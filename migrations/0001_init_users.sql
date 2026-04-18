-- 0001_init_users.sql — consolidated modern schema
--
-- Originally the upstream facebook-ad-scaler repo shipped a Facebook-login-
-- only schema here (fb_user_id NOT NULL UNIQUE, fb_access_token NOT NULL,
-- no password fields). Several of those columns were later dropped/altered
-- via direct `wrangler d1 execute` commands that were NEVER captured as
-- tracked migrations, so running the upstream 0001→0023 chain on a fresh
-- database produced a schema incompatible with the app's auth code
-- (which writes email + password_hash + role).
--
-- For the adbot-ai-product self-host template this file consolidates
-- everything the current auth code expects into 0001, so a fresh
-- `wrangler d1 execute --file 0001.sql` produces a usable users table.
-- Migration 0017 still runs its ALTER TABLE ADD COLUMN role; we defensively
-- guard with a CHECK-add-if-missing idiom via a secondary 0002 migration
-- so the chain converges cleanly.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,                         -- UUID
  email           TEXT NOT NULL UNIQUE,                     -- login identifier
  name            TEXT,
  password_hash   TEXT,                                     -- scrypt / argon2id output
  password_salt   TEXT,                                     -- separate salt column (legacy, kept)
  fb_token        TEXT,                                     -- long-lived FB user token (encrypted)
  fb_token_expires_at INTEGER,                              -- unix seconds
  fb_user_id      TEXT,                                     -- admin's FB uid (nullable; set on OAuth)
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login_at   INTEGER
  -- is_active INTEGER added by migration 0007_team_invites.sql (don't duplicate here).
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Session-cookie-based auth stores JWTs; the original sessions table from
-- upstream is unused by current code (auth.ts signs stateless JWTs), so
-- we omit it. If your deployment needs DB-backed sessions, add a separate
-- migration.

-- Audit log for critical actions (kept from upstream).
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  action     TEXT NOT NULL,
  metadata   TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
