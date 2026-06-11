-- Per-user chat read cursor. The chat page stamps last_read_at while
-- you're viewing the room; the sidebar counts messages newer than your
-- cursor (authored by others, not deleted) to badge the Chat entry.
create table if not exists public.chat_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  room text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, room)
);

alter table public.chat_reads enable row level security;

drop policy if exists "chat_reads own rows" on public.chat_reads;
create policy "chat_reads own rows"
  on public.chat_reads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
