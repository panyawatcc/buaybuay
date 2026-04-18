-- 0020_bot_actions_audit.sql
-- Add status + error + source/target ad id columns to bot_actions so the
-- clone_ad pipeline can audit failure paths (not just success). Previously
-- only the success branch at evaluate.ts:524 wrote a bot_actions row — the
-- four fail paths (list-ads-failed, no-ads, all-ineligible, all-copies-failed)
-- only left a debug trail with no queryable audit record.
--
-- Non-destructive: existing rows default to status='success' (accurate — all
-- prior inserts were from success-paths) and NULL for the other new columns.

ALTER TABLE bot_actions ADD COLUMN status         TEXT NOT NULL DEFAULT 'success';
ALTER TABLE bot_actions ADD COLUMN error_message  TEXT;
ALTER TABLE bot_actions ADD COLUMN source_ad_id   TEXT;
ALTER TABLE bot_actions ADD COLUMN target_ad_id   TEXT;

-- Helpful for "show all recent failures" dashboards without scanning the full table.
CREATE INDEX IF NOT EXISTS idx_bot_actions_status_time
  ON bot_actions(status, executed_at DESC);
