-- Per-lever saved recipient set. The Log Report lever (and any
-- future broadcast lever) lets a super admin pick teammates in the
-- UI; this column persists that selection so the same set is used
-- by both the auto-fire cron and the next manual pull. Empty array
-- means "no override saved" — the cron + pull routes fall back to
-- their default cohort (all super admins) in that case.
alter table public.lever_schedules
  add column if not exists recipient_user_ids uuid[] not null default '{}';

comment on column public.lever_schedules.recipient_user_ids is
  'Super-admin-picked recipient ids for the lever''s auto-fire and manual pulls. Empty = use the lever''s default cohort.';
