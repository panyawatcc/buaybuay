-- 0021_rules_clone_status.sql
-- Adds clone_status column to rules table so operators can opt in to
-- auto-active clones (default PAUSED for safety). Applies to both
-- clone_ad (Path G creative-reference POST) and clone_campaign
-- (full reconstruction) action types. When PAUSED, the operator
-- must manually activate — same behavior as pre-migration.
--
-- Accepted values: 'PAUSED' | 'ACTIVE'
-- Default 'PAUSED' — preserves current behavior for existing rules.

ALTER TABLE rules ADD COLUMN clone_status TEXT NOT NULL DEFAULT 'PAUSED';

-- No index needed — column is only read inline at action-dispatch time;
-- never a WHERE filter.
