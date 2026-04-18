-- 0022_rules_safety_caps.sql
-- Adds two safety-cap columns to rules for the session-14 bundle
-- (cooldown minutes + max budget change percent).
--
-- cooldown_minutes: finer-grained cooldown than existing cooldown_hours.
--   When > 0, overrides cooldown_hours. Default 0 = preserves existing
--   cooldown_hours behaviour. Writes no bot_actions row when 0.
--
-- max_budget_change_percent: cap on per-action budget delta as a safety
--   guard against runaway scaling. Default 100 = no extra constraint
--   (current behaviour preserved). When < 100, budget actions that would
--   exceed this percentage delta are blocked + audited + telegram'd.
--
-- Non-destructive; existing rows default to preserve current semantics.

ALTER TABLE rules ADD COLUMN cooldown_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rules ADD COLUMN max_budget_change_percent INTEGER NOT NULL DEFAULT 100;
