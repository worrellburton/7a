-- Mirror outreach's "Rating" tier onto partners so the same pill
-- renders on both surfaces. Backfilled from the linked contact's
-- rating when the partner has a contact_id and the contact carries
-- one. Same CHECK constraint as contacts.rating so the two values
-- can't drift to different vocabularies.
alter table public.partners
  add column if not exists rating text;

alter table public.partners
  drop constraint if exists partners_rating_check;
alter table public.partners
  add constraint partners_rating_check
    check (rating is null or rating in ('Tier 1', 'Tier 2', 'Tier 3'));

-- Backfill from linked contacts. Only fills blanks so any rating an
-- admin might have already typed on the partner row stays put.
update public.partners p
set rating = c.rating
from public.contacts c
where p.contact_id = c.id
  and (p.rating is null or p.rating = '')
  and c.rating is not null;

comment on column public.partners.rating is 'Outreach-style tier rating (Tier 1 / Tier 2 / Tier 3). Mirrors contacts.rating so the same pill shows on both surfaces.';
