-- Per-call audit log for SerpAPI requests. Every successful or
-- failed call from src/lib/serpapi.ts inserts a row here so the
-- "Information / Source Health" page (Phase 8) can show usage,
-- per-engine cost, and recent errors. Until that page lands, the
-- table is the truthful answer to "where did our SerpAPI credits
-- go this week?". The in-process daily counter in serpapi.ts is the
-- fast-path budget guard; this table is the slow-path audit trail.
create table if not exists public.seo_serpapi_usage (
  id uuid primary key default gen_random_uuid(),
  engine text not null,
  query text,
  -- SerpAPI bills 1 successful unit per non-cached search across
  -- the engines we use. Stored as a column so a future pricing
  -- change doesn't force a schema migration.
  cost_units integer not null default 1,
  duration_ms integer,
  ok boolean not null default true,
  http_status integer,
  error text,
  search_id text,
  called_by uuid references public.users(id) on delete set null,
  called_at timestamptz not null default now()
);

create index if not exists seo_serpapi_usage_called_at_idx
  on public.seo_serpapi_usage (called_at desc);
create index if not exists seo_serpapi_usage_engine_called_at_idx
  on public.seo_serpapi_usage (engine, called_at desc);

alter table public.seo_serpapi_usage enable row level security;

drop policy if exists "seo_serpapi_usage admin select" on public.seo_serpapi_usage;
create policy "seo_serpapi_usage admin select"
  on public.seo_serpapi_usage
  for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

drop policy if exists "seo_serpapi_usage admin insert" on public.seo_serpapi_usage;
create policy "seo_serpapi_usage admin insert"
  on public.seo_serpapi_usage
  for insert
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );
