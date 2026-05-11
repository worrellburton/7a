-- public.contacts.company_website — optional URL stored alongside the
-- company name on each outreach contact. Surfaced as a small external-
-- link icon next to the company text in the grid — click pops the
-- website open in a new tab. Lets admissions click straight through
-- to a partner's site without leaving the page or hunting in notes.

alter table public.contacts
  add column if not exists company_website text;
