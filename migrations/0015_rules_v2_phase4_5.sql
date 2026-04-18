-- 0015_rules_v2_phase4_5.sql
-- Phase 4 (auto-actions) + Phase 5 (creative health) columns on rules.
-- All nullable / defaulted → backward compat with v1/v2/v3 rules.

-- Phase 4: Auto-actions
ALTER TABLE rules ADD COLUMN auto_pause_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rules ADD COLUMN auto_pause_spend_multiplier REAL NOT NULL DEFAULT 1.5;
ALTER TABLE rules ADD COLUMN clone_winner_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rules ADD COLUMN clone_winner_roas_multiplier REAL NOT NULL DEFAULT 2.0;
ALTER TABLE rules ADD COLUMN clone_winner_consecutive_days INTEGER NOT NULL DEFAULT 3;

-- Phase 5: Creative health
ALTER TABLE rules ADD COLUMN max_frequency REAL NOT NULL DEFAULT 3.5;
ALTER TABLE rules ADD COLUMN min_ctr REAL;                   -- nullable = gate disabled
