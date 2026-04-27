-- Server-side state for the off-site directory tracker. Replaces the
-- localStorage-only `useLinkMap` / `useStatusMap` so the team can see
-- each other's progress and so we can attribute who added each live
-- link and when.
--
-- The directory_id is the curated text key from the DIRECTORIES array
-- in src/app/app/seo/directories/content.tsx (e.g. "samhsa-findtreatment").

create table if not exists public.directory_states (
  directory_id text primary key,
  status text not null default 'todo' check (status in ('todo','pending','listed','skip')),
  link text,
  link_set_by uuid references public.users(id),
  link_set_at timestamptz,
  status_set_by uuid references public.users(id),
  status_set_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists directory_states_link_set_by_idx
  on public.directory_states(link_set_by);
create index if not exists directory_states_status_set_by_idx
  on public.directory_states(status_set_by);

drop trigger if exists directory_states_set_updated_at on public.directory_states;
create trigger directory_states_set_updated_at
  before update on public.directory_states
  for each row execute function public.set_updated_at();

alter table public.directory_states enable row level security;

drop policy if exists directory_states_select_admin on public.directory_states;
create policy directory_states_select_admin
  on public.directory_states
  for select
  using (is_admin());

drop policy if exists directory_states_write_admin on public.directory_states;
create policy directory_states_write_admin
  on public.directory_states
  for all
  using (is_admin())
  with check (is_admin());

-- Realtime so a teammate's edit lights up live (status pill, green
-- tint when a link is added, "added by …" attribution on save).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'directory_states'
  ) then
    execute 'alter publication supabase_realtime add table public.directory_states';
  end if;
end $$;
