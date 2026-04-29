-- Custom (admin-added) directory entries. The /app/seo/directories
-- page ships with a 100-row hardcoded DIRECTORIES list curated for
-- addiction-treatment SEO; this table lets the team add directories
-- they discover later without a code change. Entries from this table
-- are merged with the hardcoded list at render time, sharing the
-- same status / link / chat tooling.

create table if not exists public.seo_custom_directories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  category text not null check (category in (
    'national','insurance','mental_health','healthcare','review',
    'arizona','recovery','specialty','professional','business'
  )),
  why text,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  fit smallint not null default 50 check (fit between 1 and 100),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists seo_custom_directories_category_idx on public.seo_custom_directories (category);
create index if not exists seo_custom_directories_created_at_idx on public.seo_custom_directories (created_at desc);

alter table public.seo_custom_directories enable row level security;

drop policy if exists seo_custom_directories_select on public.seo_custom_directories;
create policy seo_custom_directories_select on public.seo_custom_directories
  for select to authenticated using (true);

drop policy if exists seo_custom_directories_insert on public.seo_custom_directories;
create policy seo_custom_directories_insert on public.seo_custom_directories
  for insert to authenticated with check (auth.uid() = created_by or created_by is null);

drop policy if exists seo_custom_directories_delete on public.seo_custom_directories;
create policy seo_custom_directories_delete on public.seo_custom_directories
  for delete to authenticated using (true);

alter publication supabase_realtime add table public.seo_custom_directories;
