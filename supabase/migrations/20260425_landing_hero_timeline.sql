-- Singleton row holding the ordered list of site_videos.id values
-- that play in the public landing-page hero section. The /app/landing
-- admin page is a drag-and-drop editor for this row; the public
-- hero reads it (newest first) to know what to render.
create table if not exists public.landing_hero_timeline (
  id text primary key default 'primary',
  video_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint landing_hero_timeline_singleton check (id = 'primary')
);

alter table public.landing_hero_timeline enable row level security;

-- Public read so the marketing site (anon) can render the hero;
-- writes are server-side only via the API route's admin client.
drop policy if exists "landing hero timeline readable by everyone" on public.landing_hero_timeline;
create policy "landing hero timeline readable by everyone"
  on public.landing_hero_timeline
  for select
  to anon, authenticated
  using (true);

create or replace function public.touch_landing_hero_timeline()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_landing_hero_timeline_touch on public.landing_hero_timeline;
create trigger trg_landing_hero_timeline_touch
  before update on public.landing_hero_timeline
  for each row execute function public.touch_landing_hero_timeline();

-- Seed the singleton with an empty list so the GET endpoint always
-- has something to return.
insert into public.landing_hero_timeline (id, video_ids)
values ('primary', '{}')
on conflict (id) do nothing;

comment on table public.landing_hero_timeline is
  'Singleton (id=primary). Ordered video_ids the public landing hero plays. Edited via /app/landing.';
