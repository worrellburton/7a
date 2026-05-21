-- Partial indexes for the spam-free + open-status query pattern
-- that every website-requests overview / unread-count endpoint
-- runs on every page load:
--
--   from('vob_requests' | 'contact_submissions')
--     .is('spam_at', null)
--     .eq('status', '...')
--
-- The plain `status` index already exists but Postgres still has to
-- read each matching row to check `spam_at`. A partial index on
-- `status` WHERE `spam_at` IS NULL pre-filters the spam ones out at
-- the index level, so the planner does an index-only scan for the
-- count + listing queries that dominate the website-requests
-- dashboards.

create index if not exists vob_requests_status_unspam_idx
  on public.vob_requests (status)
  where spam_at is null;

create index if not exists contact_submissions_status_unspam_idx
  on public.contact_submissions (status)
  where spam_at is null;

-- Adding `responded_at` to the predicate too would help the
-- 'unread + unresponded' count path but that filter isn't applied
-- uniformly across every dashboard, so we keep this conservative
-- and let Postgres' bitmap-AND combine the new index with any
-- responded_at index when the planner decides it's worth it.
