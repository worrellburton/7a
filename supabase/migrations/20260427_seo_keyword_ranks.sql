-- Persisted history of SerpAPI keyword rank checks. One row per
-- keyword per check, so the Overview page can render a sparkline +
-- Δ-vs-last-week per keyword instead of just the most-recent rank
-- the route happens to return.
--
-- The keyword_id column matches the curated set in src/lib/seo/keywords.ts
-- (e.g. "loc-01", "mod-02"). It's a free-form text field rather than
-- an FK so a keyword retired from the curated list still has its
-- history queryable.
create table if not exists public.seo_keyword_ranks (
  id uuid primary key default gen_random_uuid(),
  keyword_id text not null,
  keyword_text text not null,
  domain text not null,
  rank integer,
  url text,
  serp_features jsonb,
  total_organic integer,
  checked_at timestamptz not null default now(),
  checked_by uuid references public.users(id) on delete set null
);

create index if not exists seo_keyword_ranks_keyword_checked_idx
  on public.seo_keyword_ranks (keyword_id, checked_at desc);
create index if not exists seo_keyword_ranks_checked_idx
  on public.seo_keyword_ranks (checked_at desc);
create index if not exists seo_keyword_ranks_domain_keyword_idx
  on public.seo_keyword_ranks (domain, keyword_id, checked_at desc);

alter table public.seo_keyword_ranks enable row level security;

drop policy if exists "seo_keyword_ranks admin select" on public.seo_keyword_ranks;
create policy "seo_keyword_ranks admin select"
  on public.seo_keyword_ranks
  for select
  using (is_admin());

drop policy if exists "seo_keyword_ranks admin insert" on public.seo_keyword_ranks;
create policy "seo_keyword_ranks admin insert"
  on public.seo_keyword_ranks
  for insert
  with check (is_admin());
