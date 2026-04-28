-- Top-10 competitor capture per keyword sweep. Each row is one
-- (keyword × position × check) triple, so the page can answer "who
-- jumped us this week?" without re-running SerpAPI. Pulls from the
-- same google search the rank route already runs — Phase 7 just
-- persists the URLs we were already throwing away.
create table if not exists public.seo_competitor_serps (
  id uuid primary key default gen_random_uuid(),
  keyword_id text not null,
  keyword_text text not null,
  position integer not null,
  url text not null,
  domain text not null,
  title text,
  snippet text,
  is_us boolean not null default false,
  checked_at timestamptz not null default now()
);

create index if not exists seo_competitor_serps_kw_checked_idx
  on public.seo_competitor_serps (keyword_id, checked_at desc, position);
create index if not exists seo_competitor_serps_domain_checked_idx
  on public.seo_competitor_serps (domain, checked_at desc);

alter table public.seo_competitor_serps enable row level security;

drop policy if exists "seo_competitor_serps admin select" on public.seo_competitor_serps;
create policy "seo_competitor_serps admin select"
  on public.seo_competitor_serps for select using (is_admin());
drop policy if exists "seo_competitor_serps admin insert" on public.seo_competitor_serps;
create policy "seo_competitor_serps admin insert"
  on public.seo_competitor_serps for insert with check (is_admin());
