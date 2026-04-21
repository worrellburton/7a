-- User approval status: non-@sevenarrowsrecovery.com signups land in
-- "on_hold" and can't see the app until a super admin approves them.

alter table public.users
  add column if not exists status text not null default 'active'
  check (status in ('active', 'on_hold', 'denied'));

create index if not exists users_status_idx on public.users(status);

-- Flip existing rows whose email isn't on the allowed domain (and aren't
-- already denied) into on_hold. Admins stay active so they can approve
-- the rest.
update public.users
set status = 'on_hold'
where status = 'active'
  and is_admin is not true
  and coalesce(email, '') not ilike '%@sevenarrowsrecovery.com';

-- Trigger: on insert, flip non-org emails to on_hold automatically.
create or replace function public.users_set_initial_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is null or new.status = 'active' then
    if new.is_admin is not true
      and coalesce(new.email, '') not ilike '%@sevenarrowsrecovery.com' then
      new.status := 'on_hold';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_set_initial_status on public.users;
create trigger users_set_initial_status
  before insert on public.users
  for each row execute function public.users_set_initial_status();
