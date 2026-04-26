-- Free-form note attached when an admin marks a Website Request as
-- responded. Surfaced in the admin UI as a tooltip on the
-- "Responded by …" badge so the team can see what was actually said
-- to the lead without leaving the list view.
alter table public.vob_requests
  add column if not exists responded_note text;

alter table public.contact_submissions
  add column if not exists responded_note text;
