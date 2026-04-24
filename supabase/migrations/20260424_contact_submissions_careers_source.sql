-- Add 'careers' to the source check constraint on contact_submissions
-- so the OpenPositions form on /careers can post via
-- /api/public/contact and the admin "Careers" subpage under Website
-- Requests can filter to source='careers'.

alter table public.contact_submissions
  drop constraint if exists contact_submissions_source_check;
alter table public.contact_submissions
  add constraint contact_submissions_source_check
  check (source in ('contact_page','footer','exit_intent','careers','other'));
