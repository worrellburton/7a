-- "Time sober" feature on alumni profiles. sobriety_date already
-- exists (the anchor). This adds the toggle, the daily check-in
-- bookkeeping, and the opt-in share flag.
alter table public.alumni_profiles
  add column if not exists track_sobriety boolean not null default false,
  add column if not exists sobriety_public boolean not null default false,
  add column if not exists last_check_in_at timestamptz,
  add column if not exists check_in_streak int not null default 0;
