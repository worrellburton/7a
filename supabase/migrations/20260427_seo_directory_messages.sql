-- Per-directory comment thread, mirroring seo_backlink_messages and
-- facilities_issue_messages. The directory_id is the stable
-- identifier from src/app/app/seo/directories/content.tsx (e.g.
-- "samhsa-findtreatment", "psychology-today-rehab"), not a uuid —
-- those ids are the curated keys baked into the DIRECTORIES array.

create table if not exists public.seo_directory_messages (
  id uuid primary key default gen_random_uuid(),
  directory_id text not null,
  body text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists seo_directory_messages_directory_id_idx
  on public.seo_directory_messages(directory_id);

create index if not exists seo_directory_messages_created_at_idx
  on public.seo_directory_messages(created_at desc);

alter table public.seo_directory_messages enable row level security;

drop policy if exists seo_directory_messages_select_admin on public.seo_directory_messages;
create policy seo_directory_messages_select_admin
  on public.seo_directory_messages
  for select
  using (is_admin());

drop policy if exists seo_directory_messages_insert_admin on public.seo_directory_messages;
create policy seo_directory_messages_insert_admin
  on public.seo_directory_messages
  for insert
  with check (is_admin() and user_id = (select auth.uid()));

drop policy if exists seo_directory_messages_delete_own on public.seo_directory_messages;
create policy seo_directory_messages_delete_own
  on public.seo_directory_messages
  for delete
  using (is_admin() and user_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'seo_directory_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.seo_directory_messages';
  end if;
end $$;
