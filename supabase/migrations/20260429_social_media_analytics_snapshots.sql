-- Daily snapshots of Ayrshare /analytics/social. The cron at
-- /api/cron/social-media/analytics writes one row per connected
-- platform per run, so we own the time-series instead of relying
-- on Ayrshare returning live data on every page view.
--
-- raw stores the full Ayrshare per-platform blob — we don't break
-- it into per-stat columns because the field shape is wildly
-- inconsistent across platforms (Facebook nests under 'analytics',
-- Instagram has top-level mediaCountTotal, YouTube uses
-- subscriberCount). The UI pulls headline numbers via the same
-- extractStats helper that already exists client-side.

create table if not exists public.social_media_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  platform text not null,
  raw jsonb,
  source text not null default 'cron' check (source in ('cron','manual'))
);

create index if not exists social_media_analytics_snapshots_platform_time_idx
  on public.social_media_analytics_snapshots (platform, captured_at desc);

create index if not exists social_media_analytics_snapshots_captured_at_idx
  on public.social_media_analytics_snapshots (captured_at desc);

alter table public.social_media_analytics_snapshots enable row level security;

drop policy if exists social_media_analytics_snapshots_select
  on public.social_media_analytics_snapshots;
create policy social_media_analytics_snapshots_select
  on public.social_media_analytics_snapshots
  for select to authenticated using (true);
