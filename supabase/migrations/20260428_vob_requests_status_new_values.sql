-- Replace the legacy status set (new / contacted / verified /
-- not_eligible / archived — none of which were ever surfaced in the
-- UI as user-pickable) with the four statuses the admin team
-- actually uses on the VOBs page:
--   new        — fresh submission, nobody has triaged it yet
--   qualifying — actively being verified
--   short_term — short-term VOB outcome (so the team can filter)
--   closed     — done, nothing more to do here
--
-- Existing rows in this DB are all 'new', so no data migration
-- is required. Default stays 'new' so the website form's INSERT
-- continues to work unchanged.

alter table public.vob_requests
  drop constraint if exists vob_requests_status_check;

alter table public.vob_requests
  add constraint vob_requests_status_check
  check (status = any (array['new'::text, 'qualifying'::text, 'short_term'::text, 'closed'::text]));
