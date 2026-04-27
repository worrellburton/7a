-- Per-backlink chat thread, mirroring facilities_issue_messages.
--
-- Backlinks aren't normalized rows (snapshots live blob-stored in
-- seo_backlinks_snapshots.payload), so the foreign key here is the
-- backlink's source_url. That's stable across re-syncs — Semrush
-- returns the same source_url for the same link, and the comment
-- thread stays attached to the link rather than to a snapshot row.

create table if not exists public.seo_backlink_messages (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  body text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists seo_backlink_messages_source_url_idx
  on public.seo_backlink_messages(source_url);

create index if not exists seo_backlink_messages_created_at_idx
  on public.seo_backlink_messages(created_at desc);

-- RLS — admins only (matches the rest of /app/seo).
alter table public.seo_backlink_messages enable row level security;

drop policy if exists seo_backlink_messages_select_admin on public.seo_backlink_messages;
create policy seo_backlink_messages_select_admin
  on public.seo_backlink_messages
  for select
  using (is_admin());

drop policy if exists seo_backlink_messages_insert_admin on public.seo_backlink_messages;
create policy seo_backlink_messages_insert_admin
  on public.seo_backlink_messages
  for insert
  with check (is_admin() and user_id = (select auth.uid()));

drop policy if exists seo_backlink_messages_delete_own on public.seo_backlink_messages;
create policy seo_backlink_messages_delete_own
  on public.seo_backlink_messages
  for delete
  using (is_admin() and user_id = (select auth.uid()));

-- Realtime so a teammate's post lights up the unread dot live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'seo_backlink_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.seo_backlink_messages';
  end if;
end $$;
