-- activity_log SELECT now open to any authenticated user. Two
-- problems were rolled into this single migration:
--
--   1. The previous admin-only SELECT policy was killing the
--      .insert().select().single() round-trip in lib/db.ts for
--      non-admin users — the after-insert SELECT failed RLS,
--      which rolled the INSERT back. Net: only admins ever wrote
--      to activity_log, so the "Recent activity" feed showed
--      nothing from non-admin teammates (e.g. Muhammad) even
--      though directory_states.link_set_by recorded their work.
--
--   2. Even after fixing the round-trip, the team wanted the
--      activity feed to be a shared source of truth — every
--      teammate can see what everyone is doing, not just admins.
--
-- Both are solved by opening SELECT to all authenticated users.
DROP POLICY IF EXISTS activity_log_admin_select ON public.activity_log;
DROP POLICY IF EXISTS activity_log_select_self_or_admin
  ON public.activity_log;

CREATE POLICY activity_log_select_all_authed
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (true);
