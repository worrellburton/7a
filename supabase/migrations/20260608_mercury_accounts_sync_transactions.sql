-- Per-account toggle: should /api/mercury/sync pull this account's
-- transactions, or just refresh its balance?
--
-- The org Mercury token typically has more accounts than you actually
-- want in your books — e.g. a treasury vault, savings, holding
-- accounts. This flag lets the super admin uncheck those from the
-- account cards on /app/mercury so the sync stays scoped to operating
-- accounts while still showing every balance.
--
-- Default true so the first sync after the migration walks
-- everything, matching the existing behaviour. The admin then
-- toggles off the ones they don't care to mirror transactions for.

ALTER TABLE public.mercury_accounts
  ADD COLUMN IF NOT EXISTS sync_transactions boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.mercury_accounts.sync_transactions IS
  'When false, /api/mercury/sync skips this account''s transaction pull but still refreshes its balance. Toggled from the /app/mercury account cards.';
