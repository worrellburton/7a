-- Alumni-only flag on page_permissions. When true, the page is
-- visible exclusively to users with user_kind='alumni' (staff,
-- admins, and super-admins won't see it in the sidebar / routing).
-- Defaults to false so every existing page stays staff-visible.

alter table public.page_permissions
  add column if not exists alumni_only boolean not null default false;

create index if not exists page_permissions_alumni_only_idx
  on public.page_permissions (alumni_only) where alumni_only = true;
