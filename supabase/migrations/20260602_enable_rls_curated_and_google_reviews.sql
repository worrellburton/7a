-- Closes the Supabase security advisor's two ERROR-level findings:
--   public.curated_reviews — rls_disabled_in_public
--   public.google_reviews  — rls_disabled_in_public
--
-- Every read/write of both tables in this app goes through
-- getAdminSupabase() (service-role), which bypasses RLS entirely.
-- No client/frontend Supabase queries hit these tables — the
-- marketing site reads them via the server-side /api/reviews and
-- /api/public/login-content endpoints. Enabling RLS with NO
-- permissive policies therefore denies anon/authenticated direct
-- queries (the actual attack surface the advisor flagged) without
-- breaking any legitimate caller.
--
-- If a future feature needs to read these tables from a non-admin
-- code path, add a targeted SELECT policy then — don't open the
-- table back up wholesale.

alter table public.curated_reviews enable row level security;
alter table public.google_reviews enable row level security;
