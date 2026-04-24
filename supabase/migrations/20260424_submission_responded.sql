-- "I responded" marker for admin submission triage.
--
-- Admins working the Website Requests queues asked for a simple
-- per-row "I responded" button so the team can see who reached out
-- and when without rolling through every submission again.
--
-- Two nullable columns on each of the two submission tables:
--   responded_at  — timestamp when an admin clicked the button
--   responded_by  — auth.users(id) of the admin who clicked it
--
-- null in both columns == "not yet responded to". No enum change
-- needed; this is an additive, optional overlay on top of status.

alter table public.vob_requests
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by uuid references auth.users (id) on delete set null;

alter table public.contact_submissions
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by uuid references auth.users (id) on delete set null;

create index if not exists vob_requests_responded_at_idx
  on public.vob_requests (responded_at);
create index if not exists contact_submissions_responded_at_idx
  on public.contact_submissions (responded_at);
