-- Physical / work location shown + edited on the Team grid (Name · Position
-- · Department · E-mail · Location · Phone). Nullable free-text; no backfill.
alter table public.users
  add column if not exists location text;
