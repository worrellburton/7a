-- One-shot RLS audit. Run on production via Supabase SQL editor:
--   https://supabase.com/dashboard/project/_/sql/new
--
-- Three things it surfaces:
--
--   (1) Every public.* table whose rowsecurity flag is FALSE.
--       These are wide open to any authenticated client.
--   (2) Every public.* table where RLS is ON but ZERO policies
--       exist. RLS-on with no policies = denies every authenticated
--       read/write by default. Sometimes intentional (service-role
--       only), but usually a missed migration.
--   (3) Tables referenced by name in src/ but with no
--       CREATE TABLE migration in supabase/migrations/. These
--       were created via the dashboard before migrations were
--       source-controlled, so the only way to vet their RLS
--       posture is at runtime here.
--
-- Expected zero rows from (1) and (2). Any row from (3) that
-- isn't on the known-orphan list (users, activity_log, …) means
-- the migrations dir drifted vs. live again — re-run after.

-- (1) Tables with RLS disabled
SELECT
  '(1) RLS DISABLED' AS finding,
  c.relname AS table_name,
  NULL::int AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity IS FALSE
ORDER BY c.relname;

-- (2) RLS enabled but no policies
SELECT
  '(2) RLS ON, NO POLICIES' AS finding,
  c.relname AS table_name,
  0 AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity IS TRUE
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- (3) Source-controlled migration audit. The known-orphan list
-- below = tables we know exist in production but were created
-- pre-migrations. Anything outside this list returning here means
-- new drift. Cross-check with `ls supabase/migrations/` after.
WITH source_tables AS (
  SELECT unnest(ARRAY[
    'activity_log','calendar_day_aod','calendar_events','call_logs',
    'department_budgets','department_personnel','departments',
    'equine','equine_feed_logs','equine_weight_logs','horses',
    'jd_signatures','job_descriptions','users'
  ]) AS table_name
)
SELECT
  '(3) IN PROD, NOT IN MIGRATIONS' AS finding,
  c.relname AS table_name,
  (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)::int AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN source_tables s ON s.table_name = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND s.table_name IS NOT NULL
ORDER BY c.relname;
