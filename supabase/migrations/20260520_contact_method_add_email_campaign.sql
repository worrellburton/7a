-- Adds 'Email Campaign' as an allowed value on every contact-method
-- CHECK constraint so the email-campaigns send flow can write a log
-- entry per recipient. Each successful send now leaves a row in
-- public.contact_logs and bumps contacts.last_contact_* so the
-- contact's activity log surfaces the email immediately.

alter table public.contacts
  drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.contact_logs
  drop constraint if exists contact_logs_method_check;
alter table public.contact_logs
  add constraint contact_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partners
  drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partner_logs
  drop constraint if exists partner_logs_method_check;
alter table public.partner_logs
  add constraint partner_logs_method_check
  check (method in ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));
