-- Team invites for member onboarding
CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT DEFAULT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON team_invites(email);

-- Soft delete + tracking on users (IF NOT EXISTS columns — use ALTER)
-- Note: ALTER TABLE ADD COLUMN is idempotent in SQLite if column doesn't exist
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
