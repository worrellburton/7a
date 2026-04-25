-- Optional credentials string for staff profiles. Renders after the
-- user's name everywhere (e.g. "Connie Smith, LMSW"). Free-text so
-- people can write whatever fits — "PhD", "MD, MPH", "LISAC, LCSW".
alter table public.users
  add column if not exists credentials text;

comment on column public.users.credentials is
  'Optional letters that follow the user''s name (e.g. "LMSW", "PhD"). Free-text. Edited from /app/profile.';
