-- Staff onboarding flow: a one-time, skippable 5-card welcome shown to
-- team members (user_kind <> 'alumni') on login until completed.
--   onboarding_completed_at — set when they finish; NULL = still prompt.
--   onboarding_step         — resume cursor (0..5) if they drop off.
--   pronouns, phone         — the two profile fields the flow collects
--                             that didn't already have a column.
-- Existing rows keep onboarding_completed_at = NULL, so every current
-- team member is prompted on their next login.
alter table public.users
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists pronouns text,
  add column if not exists phone text;
