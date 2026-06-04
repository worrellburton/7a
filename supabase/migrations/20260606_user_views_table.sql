-- Per-user saved filter/sort configurations for any table-style
-- surface (Calls, Contacts, Content, Directories, Forms, etc.).
-- Each row is one named view: which surface it belongs to, the
-- filter blob to apply, an optional sort key + direction, and a
-- bool flag marking it as the user's default landing for that
-- surface. The page code reads + writes via /api/views (super-
-- simple GET/POST/DELETE) so adopting it on a new surface is one
-- import + a dropdown.
create table if not exists public.user_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  surface text not null,
  name text not null,
  filters jsonb not null default '{}',
  sort_key text,
  sort_dir text check (sort_dir in ('asc', 'desc')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_views_user_id_surface_idx
  on public.user_views (user_id, surface);

-- One default per (user, surface) — enforced via partial unique idx.
create unique index if not exists user_views_one_default_per_surface_idx
  on public.user_views (user_id, surface)
  where is_default = true;

drop trigger if exists user_views_set_updated_at on public.user_views;
create trigger user_views_set_updated_at
  before update on public.user_views
  for each row execute function public.set_updated_at();

alter table public.user_views enable row level security;

drop policy if exists user_views_select_own on public.user_views;
create policy user_views_select_own
  on public.user_views for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_views_insert_own on public.user_views;
create policy user_views_insert_own
  on public.user_views for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_views_update_own on public.user_views;
create policy user_views_update_own
  on public.user_views for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_views_delete_own on public.user_views;
create policy user_views_delete_own
  on public.user_views for delete to authenticated
  using (user_id = auth.uid());
