-- The contact_methods registry now ships 8 method values (Phone,
-- In Person, Left Message, Text Message, Email, Smoke Signals,
-- Walkie Talkie, Tin Can Phone) but the original CHECK constraints
-- on contact_logs / contacts / partner_logs / partners only allow
-- the first four. Picking "Email" on /app/outreach pops a Postgres
-- 23514 alert in the browser ("violates check constraint").
--
-- Sync each CHECK with src/lib/contact-methods.tsx so the registry
-- stays the single source of truth.

alter table public.contact_logs drop constraint if exists contact_logs_method_check;
alter table public.contact_logs
  add constraint contact_logs_method_check
  check (method = any (array[
    'Phone'::text,
    'In Person'::text,
    'Left Message'::text,
    'Text Message'::text,
    'Email'::text,
    'Smoke Signals'::text,
    'Walkie Talkie'::text,
    'Tin Can Phone'::text
  ]));

alter table public.contacts drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method = any (array[
    'Phone'::text,
    'In Person'::text,
    'Left Message'::text,
    'Text Message'::text,
    'Email'::text,
    'Smoke Signals'::text,
    'Walkie Talkie'::text,
    'Tin Can Phone'::text
  ]));

alter table public.partner_logs drop constraint if exists partner_logs_method_check;
alter table public.partner_logs
  add constraint partner_logs_method_check
  check (method = any (array[
    'Phone'::text,
    'In Person'::text,
    'Left Message'::text,
    'Text Message'::text,
    'Email'::text,
    'Smoke Signals'::text,
    'Walkie Talkie'::text,
    'Tin Can Phone'::text
  ]));

alter table public.partners drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method = any (array[
    'Phone'::text,
    'In Person'::text,
    'Left Message'::text,
    'Text Message'::text,
    'Email'::text,
    'Smoke Signals'::text,
    'Walkie Talkie'::text,
    'Tin Can Phone'::text
  ]));
