-- 0017_hybrid_agency.sql
-- Hybrid Agency Portal Phase 1 per ~/shared/hybrid-agency-portal-spec.md §2.
--
-- Spec v1 used INTEGER user_id FKs but this repo's users.id is TEXT (UUID) —
-- migration keeps TEXT to match existing schema. Non-destructive additions
-- only; users.fb_token preserved for rollback (drop in follow-up 0018 later).

-- 1) admin_fb_tokens — centrally stored admin (Golf) FB credentials.
-- One row per admin. token_encrypted reuses the existing encryptToken
-- helper (same TOKEN_ENCRYPTION_KEY as users.fb_token).
CREATE TABLE IF NOT EXISTS admin_fb_tokens (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id      TEXT NOT NULL UNIQUE,                -- FK users.id, 1-per-admin
  fb_token_encrypted TEXT NOT NULL,
  fb_user_id         TEXT NOT NULL,                        -- admin's FB UID
  fb_business_id     TEXT,                                 -- admin's Business Manager ID
  scope_granted      TEXT,                                 -- csv of granted scopes
  expires_at         INTEGER,                              -- unix seconds (FB long-lived 60d)
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2) ad_accounts — customer → ad_account_id ownership mapping. Populated
-- by /api/onboarding/verify-access once admin confirms partner access.
CREATE TABLE IF NOT EXISTS ad_accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL,                              -- FK users.id
  ad_account_id TEXT NOT NULL,                              -- e.g. "act_10158..."
  business_id   TEXT,                                       -- customer's BM ID (optional)
  account_name  TEXT,
  currency      TEXT,
  timezone      TEXT,
  granted_at    TEXT,                                       -- when admin got access (from FB)
  verified_at   TEXT NOT NULL DEFAULT (datetime('now')),
  status        TEXT NOT NULL DEFAULT 'active',             -- active | revoked | pending
  last_sync_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ad_account_id, owner_user_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_aa_owner_status ON ad_accounts(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_aa_account ON ad_accounts(ad_account_id);

-- 3) Add role column to users (customer | admin | manager). Default 'customer'
-- so any existing non-admin rows become regular tenants.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4) Mark admin@test.com as admin so the role-scope logic can find them.
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';

-- 5) Backfill admin's existing fb_token into admin_fb_tokens. Guard against
-- double-insert on re-apply via the admin_user_id UNIQUE constraint. Skips
-- admins without a token set (migration can be run even pre-OAuth connect).
INSERT OR IGNORE INTO admin_fb_tokens (admin_user_id, fb_token_encrypted, fb_user_id, scope_granted)
SELECT
  id,
  fb_token,
  COALESCE(fb_user_id, ''),
  'ads_management,ads_read,business_management,pages_read_engagement,pages_show_list,pages_read_user_content'
FROM users
WHERE role = 'admin' AND fb_token IS NOT NULL AND fb_token != '';

-- 6) users.fb_token NOT dropped — rollback safety. Future migration 0018
-- will drop after every code path migrates to getFbContext(). Keep writing
-- to it during transition (dual-write) if you want hot rollback; spec says
-- stop writing + keep column for rollback-reads only.
