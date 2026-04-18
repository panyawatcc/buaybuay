-- Phase 3: Budget & scaling policy
-- Adds 2 columns (NOT 3 — cooldown_hours already exists in 0005_rules.sql:17 with DEFAULT 24,
-- so the existing logic at evaluate.ts:72-81 already respects per-rule cooldown).
ALTER TABLE rules ADD COLUMN daily_budget_cap REAL;
ALTER TABLE rules ADD COLUMN scaling_step_pct REAL NOT NULL DEFAULT 0.15;
