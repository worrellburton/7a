-- Third orthogonal role bit. Sits beside is_admin / is_super_admin
-- rather than replacing them. An alumni admin can administer ONLY
-- alumni users — see /app/admin/user-permissions and
-- /app/admin/incoming-users for the alumni-only filter. They have
-- no access to staff, no platform-wide admin powers, and the bit
-- is independent of the is_admin / is_super_admin booleans (so a
-- staff super admin who's also an alumni admin still gets full
-- access; an alumni admin who isn't is_admin sees only the
-- alumni-scoped surfaces).
alter table public.users
  add column if not exists is_alumni_admin boolean not null default false;

-- Cheap lookup when filtering "show every alumni admin" on the
-- user-permissions page.
create index if not exists users_is_alumni_admin_idx
  on public.users (is_alumni_admin)
  where is_alumni_admin = true;
