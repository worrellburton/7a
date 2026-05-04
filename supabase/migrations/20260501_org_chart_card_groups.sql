-- Org chart "combined cards". When two+ users share a group, the
-- chart renders a single card with the group's label and every
-- member's avatar/name. Clearing the group_id on a user
-- "ungroups" them — the combined card disappears once it has < 2
-- members.

create table if not exists public.org_card_groups (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Group',
  org_x double precision not null default 0,
  org_y double precision not null default 0,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists org_card_groups_set_updated_at on public.org_card_groups;
create trigger org_card_groups_set_updated_at
  before update on public.org_card_groups
  for each row execute function public.set_updated_at();

alter table public.users
  add column if not exists org_card_group_id uuid references public.org_card_groups(id) on delete set null;

create index if not exists users_org_card_group_id_idx on public.users(org_card_group_id);

alter table public.org_card_groups enable row level security;
drop policy if exists org_card_groups_select_authed on public.org_card_groups;
create policy org_card_groups_select_authed
  on public.org_card_groups for select to authenticated using (true);
drop policy if exists org_card_groups_write_authed on public.org_card_groups;
create policy org_card_groups_write_authed
  on public.org_card_groups for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.org_card_groups replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='org_card_groups') then
    execute 'alter publication supabase_realtime add table public.org_card_groups';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='org_chart_edges') then
    execute 'alter publication supabase_realtime add table public.org_chart_edges';
  end if;
end $$;
