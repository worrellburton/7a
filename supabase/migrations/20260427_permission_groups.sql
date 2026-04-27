-- Named permission templates ("Access Groups") that a super admin can
-- build once and apply to many users. Sits on top of the existing
-- per-user override layers:
--   - user_page_permissions: per-user Allow/Block path overrides
--   - user_extra_departments: per-user extra dept memberships
--
-- A group bundles a set of pages + a set of departments under a
-- single human-readable name. Assigning a user to a group is
-- equivalent to handing them every page in the group (as Allow) and
-- every department in the group (as an extra membership) — but
-- attributed to the group, so unassigning cleans up automatically.

-- 1) The groups themselves.
create table if not exists public.permission_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create unique index if not exists permission_groups_name_unique_idx
  on public.permission_groups(lower(name));

drop trigger if exists permission_groups_set_updated_at on public.permission_groups;
create trigger permission_groups_set_updated_at
  before update on public.permission_groups
  for each row execute function public.set_updated_at();

-- 2) Pages a group grants access to. Single-direction: everything in
-- here is an Allow. Block-style overrides stay per-user.
create table if not exists public.permission_group_pages (
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  path text not null,
  primary key (group_id, path)
);

create index if not exists permission_group_pages_group_idx
  on public.permission_group_pages(group_id);

-- 3) Departments a group grants extra membership in.
create table if not exists public.permission_group_departments (
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (group_id, department_id)
);

create index if not exists permission_group_departments_group_idx
  on public.permission_group_departments(group_id);

-- 4) User assignments — which users belong to which groups.
create table if not exists public.permission_group_assignments (
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.users(id),
  primary key (group_id, user_id)
);

create index if not exists permission_group_assignments_user_idx
  on public.permission_group_assignments(user_id);
create index if not exists permission_group_assignments_group_idx
  on public.permission_group_assignments(group_id);

-- ─── RLS ───────────────────────────────────────────────────────────
-- Mirror the user_page_permissions / user_extra_departments policies:
-- super admins write everything; admins can read everything (so the
-- "you're in N groups" badge on /app/user-permissions can render
-- without elevation); the assigned user can read their own
-- assignments + the groups they're assigned to.

alter table public.permission_groups enable row level security;
alter table public.permission_group_pages enable row level security;
alter table public.permission_group_departments enable row level security;
alter table public.permission_group_assignments enable row level security;

-- permission_groups
drop policy if exists permission_groups_select_admin on public.permission_groups;
create policy permission_groups_select_admin
  on public.permission_groups
  for select
  using (
    is_admin()
    or exists (
      select 1 from public.permission_group_assignments a
      where a.group_id = permission_groups.id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists permission_groups_write_super_admin on public.permission_groups;
create policy permission_groups_write_super_admin
  on public.permission_groups
  for all
  using (is_super_admin())
  with check (is_super_admin());

-- permission_group_pages
drop policy if exists permission_group_pages_select_admin on public.permission_group_pages;
create policy permission_group_pages_select_admin
  on public.permission_group_pages
  for select
  using (
    is_admin()
    or exists (
      select 1 from public.permission_group_assignments a
      where a.group_id = permission_group_pages.group_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists permission_group_pages_write_super_admin on public.permission_group_pages;
create policy permission_group_pages_write_super_admin
  on public.permission_group_pages
  for all
  using (is_super_admin())
  with check (is_super_admin());

-- permission_group_departments
drop policy if exists permission_group_departments_select_admin on public.permission_group_departments;
create policy permission_group_departments_select_admin
  on public.permission_group_departments
  for select
  using (
    is_admin()
    or exists (
      select 1 from public.permission_group_assignments a
      where a.group_id = permission_group_departments.group_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists permission_group_departments_write_super_admin on public.permission_group_departments;
create policy permission_group_departments_write_super_admin
  on public.permission_group_departments
  for all
  using (is_super_admin())
  with check (is_super_admin());

-- permission_group_assignments
drop policy if exists permission_group_assignments_select_self_or_admin on public.permission_group_assignments;
create policy permission_group_assignments_select_self_or_admin
  on public.permission_group_assignments
  for select
  using (
    user_id = (select auth.uid())
    or is_admin()
  );

drop policy if exists permission_group_assignments_write_super_admin on public.permission_group_assignments;
create policy permission_group_assignments_write_super_admin
  on public.permission_group_assignments
  for all
  using (is_super_admin())
  with check (is_super_admin());
