-- 0014_debug_hardening.sql
-- GUARD P0-1: split full debug from rule_executions into a separate ACL'd table.
-- rule_executions.action_taken now stores sanitized (≤120 chars, fbtrace_id
-- redacted, error body stripped) strings safe for surfacing in history UI.
-- rule_executions_debug holds the full unsanitized dbg for admin/ownership
-- queries that JOIN rules.user_id = current_user.

CREATE TABLE IF NOT EXISTS rule_executions_debug (
  execution_id TEXT PRIMARY KEY,              -- matches rule_executions.id
  rule_id      TEXT NOT NULL,
  full_debug   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rule_exec_debug_rule ON rule_executions_debug(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_exec_debug_created ON rule_executions_debug(created_at);
