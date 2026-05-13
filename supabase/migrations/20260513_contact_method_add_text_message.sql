-- Adds 'Text Message' as an allowed value on every CHECK
-- constraint that gates contact-method enums, so the
-- "Log a contact" UI can offer SMS as a fourth method alongside
-- Phone / In Person / Left Message.
--
-- Tables touched:
--   contacts.last_contact_method
--   contact_logs.method
--   partners.last_contact_method
--   partner_logs.method
--
-- Postgres can't ALTER a CHECK constraint in place, so each one is
-- dropped and recreated with the expanded value set. The constraint
-- names match the ones declared in the original migrations
-- (20260501_contacts_engagement_fields.sql, 20260503_partner_logs_…).

-- contacts.last_contact_method ─────────────────────────────────
alter table public.contacts
  drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message'));

-- contact_logs.method ──────────────────────────────────────────
alter table public.contact_logs
  drop constraint if exists contact_logs_method_check;
alter table public.contact_logs
  add constraint contact_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message'));

-- partners.last_contact_method ─────────────────────────────────
alter table public.partners
  drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message'));

-- partner_logs.method ──────────────────────────────────────────
alter table public.partner_logs
  drop constraint if exists partner_logs_method_check;
alter table public.partner_logs
  add constraint partner_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message'));
