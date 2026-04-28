-- Autocomplete-discovered keyword candidates. Cheap mining engine
-- (1 unit per call) over a small set of seed prefixes; the
-- suggestions Google's autocomplete returns become candidates the
-- team triages: add to curated KEYWORDS list, watch, or ignore.
create table if not exists public.seo_keyword_discoveries (
  id uuid primary key default gen_random_uuid(),
  suggestion text not null,
  seed text,
  relevance integer,
  status text not null default 'new',
  notes text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists seo_keyword_discoveries_suggestion_uniq
  on public.seo_keyword_discoveries (lower(suggestion));
create index if not exists seo_keyword_discoveries_status_seen_idx
  on public.seo_keyword_discoveries (status, last_seen_at desc);

alter table public.seo_keyword_discoveries enable row level security;

drop policy if exists "seo_keyword_discoveries admin select" on public.seo_keyword_discoveries;
create policy "seo_keyword_discoveries admin select"
  on public.seo_keyword_discoveries for select using (is_admin());
drop policy if exists "seo_keyword_discoveries admin insert" on public.seo_keyword_discoveries;
create policy "seo_keyword_discoveries admin insert"
  on public.seo_keyword_discoveries for insert with check (is_admin());
drop policy if exists "seo_keyword_discoveries admin update" on public.seo_keyword_discoveries;
create policy "seo_keyword_discoveries admin update"
  on public.seo_keyword_discoveries for update using (is_admin()) with check (is_admin());
drop policy if exists "seo_keyword_discoveries admin delete" on public.seo_keyword_discoveries;
create policy "seo_keyword_discoveries admin delete"
  on public.seo_keyword_discoveries for delete using (is_admin());
