-- Staff onboarding flow (v2): a one-time, skippable 3-page welcome shown
-- to team members (user_kind <> 'alumni') on login until completed.
--   onboarding_completed_at — set when they finish.
--   onboarding_step         — resume cursor (0..3) if they drop off.
--   onboarding_version      — gate is version < ONBOARDING_VERSION; bump
--                             the code constant to re-prompt everyone.
--   pronouns, phone         — the two profile fields the flow collects
--                             that don't already have a column.
-- Existing rows keep onboarding_version = 0, so every current team member
-- is prompted on their next login (ONBOARDING_VERSION starts at 1).
alter table public.users
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists onboarding_version smallint not null default 0,
  add column if not exists pronouns text,
  add column if not exists phone text;
