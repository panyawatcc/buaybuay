-- 0023_rules_incremental_trigger.sql
-- Adds incremental-delta trigger mode — rule only fires when the evaluated
-- metric value is STRICTLY GREATER than its last-triggered checkpoint.
-- Prevents the same-value-re-trigger problem where cooldown expires but
-- the campaign's spend/roas/etc. hasn't moved past where it was when the
-- last action fired.
--
-- trigger_mode:
--   'absolute'     — default, fires whenever condition evaluates true (pre-bundle behavior)
--   'incremental'  — fires only when evaluated_value > last_metric_value
--
-- last_metric_value:
--   server-managed checkpoint written AFTER a successful action fires.
--   For campaign-level rules where multiple campaigns matched in one run,
--   we store the max cv across matches (most-extreme watermark).
--   NULL = no prior checkpoint (first run always passes).
--
-- Non-destructive: default 'absolute' + NULL preserves current behavior.

ALTER TABLE rules ADD COLUMN trigger_mode TEXT NOT NULL DEFAULT 'absolute';
ALTER TABLE rules ADD COLUMN last_metric_value REAL;
