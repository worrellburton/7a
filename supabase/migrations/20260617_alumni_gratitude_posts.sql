-- Alumni gratitude board. One global board; alumni post short
-- "what are you grateful for today" notes. Authors can edit (tracked
-- via edited_at) and delete their own posts. Mirrors the
-- chat_messages RLS shape: everyone signed in can read, but you can
-- only insert/edit/delete your own rows.
create table if not exists public.alumni_gratitude_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alumni_gratitude_posts_created_at_idx
  on public.alumni_gratitude_posts (created_at desc);

alter table public.alumni_gratitude_posts enable row level security;

drop policy if exists alumni_gratitude_select_authed on public.alumni_gratitude_posts;
create policy alumni_gratitude_select_authed
  on public.alumni_gratitude_posts for select to authenticated using (true);

drop policy if exists alumni_gratitude_insert_self on public.alumni_gratitude_posts;
create policy alumni_gratitude_insert_self
  on public.alumni_gratitude_posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists alumni_gratitude_update_self on public.alumni_gratitude_posts;
create policy alumni_gratitude_update_self
  on public.alumni_gratitude_posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alumni_gratitude_delete_self on public.alumni_gratitude_posts;
create policy alumni_gratitude_delete_self
  on public.alumni_gratitude_posts for delete to authenticated
  using (auth.uid() = user_id);
