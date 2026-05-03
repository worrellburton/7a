-- Incoming Users page (super-admin only) needs to distinguish staff
-- from non-staff sign-ins (guests / alumni). `user_kind` is the
-- classification a super admin sets via the new page.

alter table public.users
  add column if not exists user_kind text not null default 'staff';

alter table public.users
  drop constraint if exists users_user_kind_check;
alter table public.users
  add constraint users_user_kind_check
  check (user_kind in ('staff', 'guest', 'alumni'));

create index if not exists users_user_kind_idx on public.users(user_kind);

update public.users
  set user_kind = 'staff'
  where lower(email) like '%@sevenarrowsrecovery.com'
    and user_kind <> 'staff';
