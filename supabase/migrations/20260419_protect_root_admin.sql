-- Protect the root super admin account: bobby@sevenarrowsrecovery.com must
-- always stay active + is_admin. A trigger reasserts those fields on any
-- attempted update, so even a rogue admin flipping the toggle in the UI
-- can't demote or hold the root account.

update public.users
set is_admin = true, status = 'active'
where lower(email) = 'bobby@sevenarrowsrecovery.com';

create or replace function public.users_protect_root_admin()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.email, old.email, '')) = 'bobby@sevenarrowsrecovery.com' then
    new.is_admin := true;
    new.status := 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_root_admin on public.users;
create trigger users_protect_root_admin
  before insert or update on public.users
  for each row execute function public.users_protect_root_admin();
