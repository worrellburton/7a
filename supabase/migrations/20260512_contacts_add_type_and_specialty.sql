-- Outreach (contacts) gets a "Type" categorical column (mirrors
-- partners.type semantics but with a smaller starting set the
-- outreach team uses on first touch) and a free-text "Specialty /
-- Focus" column (mirrors partners.specialty — open vocabulary,
-- inline-edited via SearchSelectCell).
alter table public.contacts
  add column if not exists type text,
  add column if not exists specialty text;

-- No CHECK constraint on contacts.type: the starting options are
-- Detox / PHP / IOP but admissions adds new tags ad-hoc on the
-- partnerships side and we want parity (open vocabulary, surfaced
-- via SearchSelectCell on the grid).
comment on column public.contacts.type is 'Service type tag (e.g. Detox, PHP, IOP). Free-form text — UI presents a dropdown seeded with common options but accepts new values.';
comment on column public.contacts.specialty is 'Clinical specialty / focus area (e.g. Trauma, Eating Disorders). Open vocabulary, same as partners.specialty.';
