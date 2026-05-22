-- Adds 'New Contact' as an allowed value on every contact-method
-- CHECK constraint. The three contact-create paths (single add,
-- Add-with-Claude bulk, CSV import) credit the adder with a 'New
-- Contact' touchpoint so the add surfaces in the outreach
-- activity feed and the home log-rain — semantically distinct from
-- 'Data Entry' (which is the rep filling a previously empty field
-- on an existing contact).
alter table public.contacts
  drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'New Contact', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.contact_logs
  drop constraint if exists contact_logs_method_check;
alter table public.contact_logs
  add constraint contact_logs_method_check
  check (method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'New Contact', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partners
  drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'New Contact', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));

alter table public.partner_logs
  drop constraint if exists partner_logs_method_check;
alter table public.partner_logs
  add constraint partner_logs_method_check
  check (method in
    ('Phone', 'In Person', 'Left Message', 'Text Message', 'Email', 'Email Campaign', 'Data Entry', 'New Contact', 'Smoke Signals', 'Walkie Talkie', 'Tin Can Phone'));
