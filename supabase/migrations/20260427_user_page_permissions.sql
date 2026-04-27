-- Per-user page-permission overrides + a super-admin role.
--
-- Background:
-- /app pages are gated today by `page_permissions.allowed_departments`
-- (department-level) and `admin_only` (admin-vs-non-admin). This adds
-- a per-user override layer on top so a super admin can pick exactly
-- which pages a single user can or can't see — without changing the
-- page's department rules. Empty override set = fall back to the
-- existing dept rules.

-- 1) is_super_admin column. Default false; only the root admin gets
-- it. Super admin is strictly stronger than admin: every super admin
-- is also expected to be an admin, but `is_admin` alone doesn't grant
-- super-admin powers.
alter table public.users
  add column if not exists is_super_admin boolean not null default false;

create index if not exists users_is_super_admin_idx
  on public.users(is_super_admin)
  where is_super_admin = true;

update public.users
set is_super_admin = true
where lower(email) = 'bobby@sevenarrowsrecovery.com';

-- Helper: callable from RLS policies. Mirrors the is_admin() pattern.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.users where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_super_admin() to authenticated, anon;

-- 2) user_page_permissions table.
-- One row per (user, path). `can_view = true` explicitly grants access
-- (overrides dept rules), `can_view = false` explicitly denies it.
-- Absence of a row = fall back to existing department rules.
create table if not exists public.user_page_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  path text not null,
  can_view boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id),
  primary key (user_id, path)
);

create index if not exists user_page_permissions_user_idx
  on public.user_page_permissions(user_id);

-- Auto-bump updated_at on every UPDATE.
drop trigger if exists user_page_permissions_set_updated_at on public.user_page_permissions;
create trigger user_page_permissions_set_updated_at
  before update on public.user_page_permissions
  for each row execute function public.set_updated_at();

-- 3) RLS — only super admins can write; users can read their own row;
-- admins can read everyone's so the UI can show override badge counts
-- without elevating the reader to super admin.
alter table public.user_page_permissions enable row level security;

drop policy if exists user_page_permissions_select_self_or_admin on public.user_page_permissions;
create policy user_page_permissions_select_self_or_admin
  on public.user_page_permissions
  for select
  using (
    user_id = (select auth.uid())
    or is_admin()
  );

drop policy if exists user_page_permissions_write_super_admin on public.user_page_permissions;
create policy user_page_permissions_write_super_admin
  on public.user_page_permissions
  for all
  using (is_super_admin())
  with check (is_super_admin());
