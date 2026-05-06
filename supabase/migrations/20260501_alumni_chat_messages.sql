-- Alumni + team chat. One global room for now (room='general');
-- the column gives us room to add private rooms later without a
-- migration. Edits + soft deletes are tracked via edited_at +
-- deleted_at timestamps so the UI can render "edited" + remove
-- the body on delete without losing the row id.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'general',
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_at_idx
  on public.chat_messages (room, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select_authed on public.chat_messages;
create policy chat_messages_select_authed
  on public.chat_messages for select to authenticated using (true);

drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self
  on public.chat_messages for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists chat_messages_update_self on public.chat_messages;
create policy chat_messages_update_self
  on public.chat_messages for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists chat_messages_delete_self on public.chat_messages;
create policy chat_messages_delete_self
  on public.chat_messages for delete to authenticated
  using (auth.uid() = user_id);

alter table public.chat_messages replica identity full;
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;

create table if not exists public.chat_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  room text not null default 'general',
  last_read_at timestamptz not null default now(),
  primary key (user_id, room)
);

alter table public.chat_reads enable row level security;

drop policy if exists chat_reads_select_self on public.chat_reads;
create policy chat_reads_select_self
  on public.chat_reads for select to authenticated using (auth.uid() = user_id);

drop policy if exists chat_reads_write_self on public.chat_reads;
create policy chat_reads_write_self
  on public.chat_reads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
