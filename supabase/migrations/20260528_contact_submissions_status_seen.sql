-- Adds 'seen' to the contact_submissions.status enum so the
-- /app/website-requests Forms panel can offer a 3-step status
-- toggle (new → seen → closed). 'contacted' and 'archived' stay
-- valid for legacy rows / external integrations.
alter table public.contact_submissions
  drop constraint if exists contact_submissions_status_check;

alter table public.contact_submissions
  add constraint contact_submissions_status_check
  check (status = any (array['new'::text, 'seen'::text, 'contacted'::text, 'closed'::text, 'archived'::text]));
