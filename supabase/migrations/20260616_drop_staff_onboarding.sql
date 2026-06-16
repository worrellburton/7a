-- Revert the staff onboarding flow (removed per product decision).
-- Drops the columns added by 20260616_staff_onboarding_columns plus the
-- onboarding_version column. IF EXISTS keeps it idempotent / safe on a
-- DB where the flow was never added.
--
-- ORDER MATTERS: this is applied only AFTER the code that selected these
-- columns (AuthProvider profile read) is deployed, so the live profile
-- read never errors on a missing column.
alter table public.users
  drop column if exists onboarding_completed_at,
  drop column if exists onboarding_step,
  drop column if exists onboarding_version,
  drop column if exists pronouns,
  drop column if exists phone;
