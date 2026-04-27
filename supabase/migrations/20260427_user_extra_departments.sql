-- Per-user extra department memberships used purely for permission
-- gating. A user has exactly one primary `users.department_id`
-- (drives sidebar grouping, dept-tinted chips, the org chart, etc.),
-- but a super admin can grant additional departments here so the
-- user counts as a member of multiple depts for purposes of
-- `page_permissions.allowed_departments` checks.
--
-- Empty set = user has only their primary department. Adding a row
-- expands their effective set; removing a row narrows it.

create table if not exists public.user_extra_departments (
  user_id uuid not null references public.users(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.users(id),
  primary key (user_id, department_id)
);

create index if not exists user_extra_departments_user_idx
  on public.user_extra_departments(user_id);

alter table public.user_extra_departments enable row level security;

drop policy if exists user_extra_departments_select_self_or_admin on public.user_extra_departments;
create policy user_extra_departments_select_self_or_admin
  on public.user_extra_departments
  for select
  using (
    user_id = (select auth.uid())
    or is_admin()
  );

drop policy if exists user_extra_departments_write_super_admin on public.user_extra_departments;
create policy user_extra_departments_write_super_admin
  on public.user_extra_departments
  for all
  using (is_super_admin())
  with check (is_super_admin());
