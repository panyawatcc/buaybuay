-- Phase 2: Profitability gates for rule engine
-- Adds 5 columns to rules table. All NULL-able / defaulted → backward compat with v1 rules.
-- Compute: breakeven_cpa = breakeven_cpa_override ?? (product_aov * product_margin_pct)
ALTER TABLE rules ADD COLUMN target_roas REAL;
ALTER TABLE rules ADD COLUMN breakeven_cpa_override REAL;
ALTER TABLE rules ADD COLUMN min_purchases INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rules ADD COLUMN product_aov REAL;
ALTER TABLE rules ADD COLUMN product_margin_pct REAL NOT NULL DEFAULT 0.3;
