-- Rating + cell / office phone split for /app/outreach.
--
-- rating         — Tier 1 / Tier 2 / Tier 3 tag (CHECK-constrained so
--                  bad input can never land in the column). Indexed
--                  on non-null values so the inevitable "filter by
--                  Tier 1" sweep stays cheap. Surfaced as a dropdown
--                  pill in a new column after Company.
-- phone_cell     — separate mobile number column. Renders with a
--                  cell-phone icon (rounded handset).
-- phone_office   — separate office / desk number column. Renders
--                  with a building / desk-phone icon so admissions
--                  can tell at a glance which line they're dialing.
--
-- The existing `phone` column stays in place as a legacy fallback
-- (any contact imported / created before this migration keeps showing
-- its number); new edits go straight to phone_cell or phone_office.

alter table public.contacts
  add column if not exists rating text;

alter table public.contacts
  drop constraint if exists contacts_rating_check;
alter table public.contacts
  add constraint contacts_rating_check
  check (rating is null or rating in ('Tier 1', 'Tier 2', 'Tier 3'));

create index if not exists contacts_rating_idx
  on public.contacts(rating)
  where rating is not null;

alter table public.contacts
  add column if not exists phone_cell text,
  add column if not exists phone_office text;
