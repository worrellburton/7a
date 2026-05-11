-- Phase 1 of the 10-phase outreach upgrade: add the two columns the
-- Contacts page needs to track who originally referred each contact
-- and where the relationship currently stands.
--
-- `referred_from` is intentionally free-text so it can capture a
-- person, a partner, a campaign, or "Google search" without forcing
-- the team to seed a lookup table on day one. We can migrate to a
-- FK later if a structured pattern emerges.
--
-- `outcome` is a constrained string — 'active' / 'waiting' / 'closed'
-- — that drives the color-coded pill (green / yellow / red) and the
-- left-edge row accent on the Contacts grid. NULL means "no outcome
-- set yet" and renders neutral.

alter table public.contacts
  add column if not exists referred_from text,
  add column if not exists outcome text;

alter table public.contacts
  drop constraint if exists contacts_outcome_check;
alter table public.contacts
  add constraint contacts_outcome_check
  check (outcome is null or outcome in ('active', 'waiting', 'closed'));

-- Index so the new "Any outcome" filter (phase 9) and the
-- color-coded sort path don't trigger a sequential scan once the
-- table grows. Partial index — only rows with an outcome set
-- contribute, NULLs are skipped.
create index if not exists contacts_outcome_idx
  on public.contacts(outcome)
  where outcome is not null;
