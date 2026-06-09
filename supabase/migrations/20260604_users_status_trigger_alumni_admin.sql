-- Two bugs collided to silently break the alumni-admin Approve
-- button on /app/admin/user-permissions:
--
--   1. The users_status_admin_only BEFORE UPDATE trigger reverts
--      any status change when the caller's auth.uid() isn't
--      is_admin. The API endpoint that does the approve uses the
--      service-role admin client (auth.uid() = null), so the
--      trigger saw "not admin" and silently no-op'd the UPDATE.
--
--   2. The trigger didn't know about is_alumni_admin. Even a
--      direct browser write from an alumni admin (which is what
--      we eventually want as a fallback) would have been reverted
--      the same way.
--
-- Fixed both:
--   - Skip the check when the caller is the service role
--     (auth.role() = 'service_role'). Our API endpoint runs there
--     and already gates by requireSuperOrAlumniAdmin + enforces
--     target.user_kind='alumni', so the trigger doesn't need to
--     second-guess that path.
--   - Otherwise: allow when the caller is is_admin OR is_super_admin
--     OR (is_alumni_admin AND target row is user_kind='alumni').
--     Any other combination falls through to the existing silent-
--     revert behavior so legacy non-admin client writes still
--     can't sneak a status change in.
create or replace function public.users_status_admin_only()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_is_admin boolean;
  caller_is_super_admin boolean;
  caller_is_alumni_admin boolean;
begin
  if old.status is distinct from new.status then
    -- Service-role writes (our API endpoints behind requireAdmin /
    -- requireSuperOrAlumniAdmin) skip the trigger entirely.
    if coalesce(auth.role(), '') = 'service_role' then
      return new;
    end if;

    select
      coalesce(u.is_admin, false),
      coalesce(u.is_super_admin, false),
      coalesce(u.is_alumni_admin, false)
      into caller_is_admin, caller_is_super_admin, caller_is_alumni_admin
      from public.users u
      where u.id = auth.uid();

    if coalesce(caller_is_admin, false)
       or coalesce(caller_is_super_admin, false) then
      return new;
    end if;

    -- Alumni Admins may flip status on alumni rows only.
    if coalesce(caller_is_alumni_admin, false)
       and new.user_kind = 'alumni'
       and old.user_kind = 'alumni' then
      return new;
    end if;

    -- Anyone else: silently keep the existing status. No exception
    -- so old client code that's expecting a successful response
    -- still gets one.
    new.status := old.status;
  end if;
  return new;
end;
$function$;
