-- 0002_users_fb_token_columns.sql
--
-- Previously bridged a schema gap between upstream 0001 and the rest of
-- the chain. After the 0001 consolidation (see its commit) these columns
-- already exist, so this migration is now a no-op retained for history.
-- We keep the file in the chain so existing test databases don't see a
-- gap in sequential migration numbers.

SELECT 1 WHERE 1=0;  -- no-op; all columns now live in 0001
