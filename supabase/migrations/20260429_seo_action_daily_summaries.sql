-- Daily summaries of seo_actions, one row per Phoenix-local
-- calendar day. The home At-a-glance card reads from here so the
-- page doesn't burn a Claude credit on every load — the API
-- regenerates only when the action_count for the day has actually
-- moved since the cached row was written.

create table if not exists public.seo_action_daily_summaries (
  day date primary key,
  action_count integer not null default 0,
  summary text,
  generated_at timestamptz not null default now(),
  model text
);

alter table public.seo_action_daily_summaries enable row level security;

drop policy if exists seo_action_daily_summaries_select
  on public.seo_action_daily_summaries;
create policy seo_action_daily_summaries_select
  on public.seo_action_daily_summaries
  for select to authenticated using (true);
