-- Add observability to the silent-revert path. The previous version
-- silently kept old.status when the caller wasn't admin / alumni
-- admin / service-role — that's how the alumni-admin approval bug
-- went undetected for so long. We keep the silent behavior to
-- preserve the security contract (legacy non-admin clients shouldn't
-- raise on a status write attempt), but the revert now writes a row
-- to activity_log so future silent reverts surface on /app/activity
-- and /app/admin/health rather than vanishing.
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
    if coalesce(auth.role(), '') = 'service_role'
       or current_user = 'service_role' then
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

    if coalesce(caller_is_alumni_admin, false)
       and new.user_kind = 'alumni'
       and old.user_kind = 'alumni' then
      return new;
    end if;

    begin
      insert into public.activity_log (
        type, user_id, target_kind, target_id, target_label, metadata
      ) values (
        'users.status_revert_blocked',
        auth.uid(),
        'user',
        new.id::text,
        coalesce(new.full_name, new.email, new.id::text),
        jsonb_build_object(
          'attempted_status', new.status,
          'kept_status', old.status,
          'caller_is_admin', caller_is_admin,
          'caller_is_alumni_admin', caller_is_alumni_admin
        )
      );
    exception when others then
      null;
    end;

    new.status := old.status;
  end if;
  return new;
end;
$function$;
