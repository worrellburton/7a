-- Adds 'Data Entry' as an allowed value on every contact-method
-- CHECK constraint so /api/contacts/[id] PATCH can credit the
-- editor with a contact_logs touchpoint whenever they fill in a
-- previously-empty governance field (email, phone, company,
-- role, location, specialty, type). That fills two needs at once:
-- the rep gets credit on the per-rep leaderboard, and the data
-- governance score ticks up because the underlying field is now
-- populated.

alter table public.contacts
  drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.contact_logs
  drop constraint if exists contact_logs_method_check;
alter table public.contact_logs
  add constraint contact_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partners
  drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partner_logs
  drop constraint if exists partner_logs_method_check;
alter table public.partner_logs
  add constraint partner_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));
