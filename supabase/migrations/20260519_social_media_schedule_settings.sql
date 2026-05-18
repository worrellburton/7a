-- Singleton settings row that arms / disarms the social-media
-- scheduler. Used by /api/social-media/post to no-op scheduled
-- fires when is_enabled = false and by the Schedule Posts master
-- toggle in the editor. Single row, primary key fixed at 1 so
-- upserts always hit the same record.
create table if not exists public.social_media_schedule_settings (
  id smallint primary key check (id = 1),
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.social_media_schedule_settings (id, is_enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.social_media_schedule_settings enable row level security;

drop policy if exists schedule_settings_select on public.social_media_schedule_settings;
create policy schedule_settings_select
  on public.social_media_schedule_settings for select
  to authenticated using (true);

-- Writes routed through the service-role client in the API route;
-- direct PUTs from the browser are not allowed. RLS deny by default.
