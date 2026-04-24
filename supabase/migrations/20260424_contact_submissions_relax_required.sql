-- ExitIntentModal collects only an email (no name); the original
-- NOT NULL constraints master shipped on contact_submissions.first_name
-- and contact_submissions.email would force every email-only submission
-- (and any future minimal form) to fail the insert silently — the
-- /api/public/contact route catches the error and still returns ok to
-- the visitor, so the symptom is "row never appears in the admin Forms
-- list with no signal anywhere".
--
-- Relaxing both. The route still rejects payloads that have neither
-- email nor phone, so we never store a totally-empty row.

alter table public.contact_submissions
  alter column first_name drop not null,
  alter column email drop not null;
