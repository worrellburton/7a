-- Persisted history of SerpAPI google_local pack lookups. One row
-- per (keyword × location × check), so the Local pack page can show
-- both "where do we sit in the 3-pack right now?" and "who pushed
-- us out last week?" — without re-running the SerpAPI sweep on
-- every page load.
--
-- keyword_id is free-form text — matches the curated KEYWORDS list
-- in src/lib/seo/keywords.ts but doesn't FK to it because that list
-- lives in TS, not the DB. location is the geocoded SerpAPI string
-- (e.g. "Phoenix, Arizona, United States").
create table if not exists public.seo_local_ranks (
  id uuid primary key default gen_random_uuid(),
  keyword_id text not null,
  keyword_text text not null,
  query text not null,
  location text not null,
  our_position integer,
  our_place_id text,
  our_title text,
  competitors jsonb not null default '[]',
  total_results integer,
  checked_at timestamptz not null default now(),
  checked_by uuid references public.users(id) on delete set null
);

create index if not exists seo_local_ranks_kw_checked_idx
  on public.seo_local_ranks (keyword_id, location, checked_at desc);
create index if not exists seo_local_ranks_checked_idx
  on public.seo_local_ranks (checked_at desc);

alter table public.seo_local_ranks enable row level security;

drop policy if exists "seo_local_ranks admin select" on public.seo_local_ranks;
create policy "seo_local_ranks admin select"
  on public.seo_local_ranks
  for select
  using (is_admin());

drop policy if exists "seo_local_ranks admin insert" on public.seo_local_ranks;
create policy "seo_local_ranks admin insert"
  on public.seo_local_ranks
  for insert
  with check (is_admin());
