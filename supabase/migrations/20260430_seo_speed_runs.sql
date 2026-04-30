-- Run history for the SEO Speed page (/app/seo/speed). Each row is a
-- single PageSpeed Insights snapshot for one (URL, strategy) pair.
-- Storing one row per strategy (mobile vs. desktop) instead of a
-- combined record keeps the timeline queries cheap and lets the UI
-- chart each device type independently.

create table if not exists public.seo_speed_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  ran_by uuid references auth.users(id) on delete set null,
  url text not null,
  strategy text not null check (strategy in ('mobile', 'desktop')),
  performance integer,        -- 0-100, null on failure
  fcp integer,                -- First Contentful Paint, ms
  lcp integer,                -- Largest Contentful Paint, ms
  cls numeric(6,3),           -- Cumulative Layout Shift, unitless
  tbt integer,                -- Total Blocking Time, ms
  si integer,                 -- Speed Index, ms
  opportunities jsonb not null default '[]'::jsonb,
  fetch_ms integer,
  ok boolean not null default false,
  error text
);

create index if not exists seo_speed_runs_ran_at_idx on public.seo_speed_runs (ran_at desc);
create index if not exists seo_speed_runs_url_strategy_idx on public.seo_speed_runs (url, strategy, ran_at desc);

alter table public.seo_speed_runs enable row level security;

drop policy if exists seo_speed_runs_admin_select on public.seo_speed_runs;
create policy seo_speed_runs_admin_select on public.seo_speed_runs
  for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

alter publication supabase_realtime add table public.seo_speed_runs;
