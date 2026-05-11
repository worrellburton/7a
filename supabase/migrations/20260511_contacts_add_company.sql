-- public.contacts.company — the organisation / facility the contact is
-- associated with. Surfaced as a top-of-grid column on /app/outreach so
-- admissions can sort the pipeline by company and group multiple
-- contacts at the same partner / referrer org together. Indexed only
-- where non-null because the column is sparse on legacy rows.

alter table public.contacts
  add column if not exists company text;

create index if not exists contacts_company_idx
  on public.contacts(company)
  where company is not null;
