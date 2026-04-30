-- When a previously denied user signs back in, flip their status
-- from 'denied' to 'on_hold' so they re-enter the super-admin
-- pending-approval list for a fresh decision. The super admin
-- explicitly removed denied rows from the inbox view; this trigger
-- is what guarantees they reappear when (and only when) the user
-- attempts another sign-in.
--
-- We watch auth.users.last_sign_in_at — Supabase updates that
-- timestamp on every successful login. SECURITY DEFINER so the
-- function can write into public.users despite the trigger
-- running on the auth schema.

create or replace function public.reset_denied_user_on_signin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at
     and new.last_sign_in_at is not null then
    update public.users
    set status = 'on_hold'
    where id = new.id
      and status = 'denied';
  end if;
  return new;
end;
$$;

drop trigger if exists reset_denied_user_on_signin on auth.users;
create trigger reset_denied_user_on_signin
  after update of last_sign_in_at on auth.users
  for each row execute function public.reset_denied_user_on_signin();
