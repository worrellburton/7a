-- Make `users.status` admin-only at the database layer.
--
-- Why:
-- The `users_update_self_or_admin` RLS policy lets a user write any
-- column on their own row. That's reasonable for `full_name`, `avatar`
-- etc., but `status` ('active'/'on_hold'/'denied') is the actual
-- approval gate — it must only flip via an admin's Approve / Deny
-- action on /app/team. Without this, a stale client bundle (or any
-- crafted request) can re-hold an already-approved user just by
-- writing `status='on_hold'` to their own row, which is exactly the
-- footgun we hit when approved Gmail accounts kept getting yanked
-- back to the "Waiting for approval" hold screen.
--
-- This trigger silently reverts any status change made by a user who
-- isn't an admin — preserves backwards-compat (no errors, just no
-- effect) so legacy clients with the old auto-hold path no longer
-- yank approved accounts back to the hold screen.

create or replace function public.users_status_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  if old.status is distinct from new.status then
    select coalesce(u.is_admin, false)
      into caller_is_admin
      from public.users u
      where u.id = auth.uid();
    if not coalesce(caller_is_admin, false) then
      -- Silently keep the existing status. No exception so old client
      -- code that's expecting a successful response still gets one.
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_status_admin_only on public.users;
create trigger users_status_admin_only
  before update on public.users
  for each row
  execute function public.users_status_admin_only();
