-- Replace the singleton landing_hero_timeline with a multi-row
-- table so the Marketing & Admissions team can keep several named
-- hero timelines (e.g. "Spring 2026", "Veterans Day weekend") and
-- swap between them on the public site.
--
-- The old singleton row is migrated into a single "Default" entry
-- so nothing already saved is lost. Old table is left behind for
-- one release as a safety net; a follow-up will drop it once the
-- public site reads from landing_heros.
create table if not exists public.landing_heros (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled hero',
  video_ids uuid[] not null default '{}',
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.landing_heros enable row level security;

drop policy if exists "landing heros readable by everyone" on public.landing_heros;
create policy "landing heros readable by everyone"
  on public.landing_heros
  for select
  to anon, authenticated
  using (true);

create or replace function public.touch_landing_heros()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_landing_heros_touch on public.landing_heros;
create trigger trg_landing_heros_touch
  before update on public.landing_heros
  for each row execute function public.touch_landing_heros();

-- Backfill the singleton row's contents as the first entry, only
-- if the new table is empty AND the old singleton has data.
do $$
declare
  has_any boolean;
  legacy_ids uuid[];
begin
  select exists (select 1 from public.landing_heros) into has_any;
  if has_any then
    return;
  end if;
  select video_ids into legacy_ids
    from public.landing_hero_timeline
    where id = 'primary';
  insert into public.landing_heros (name, video_ids, display_order)
  values ('Default', coalesce(legacy_ids, '{}'::uuid[]), 0);
end $$;

comment on table public.landing_heros is
  'Named hero timelines for the public landing page. /app/landing edits these; the marketing site reads them by id or by lowest display_order.';
