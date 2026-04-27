-- Audit log for changes to users.public_team — i.e. who flipped a
-- person on/off the public meet-our-team page, and when. Append-only.
-- Read access is admin-only; writes go through a trigger on
-- public.users so an admin flipping the boolean from anywhere (the
-- TeamPageOrderModal, /app/profile, an SQL session) is captured the
-- same way.
create table if not exists public.team_visibility_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_name_snapshot text,
  old_value boolean,
  new_value boolean,
  changed_by uuid references public.users(id) on delete set null,
  changed_by_name_snapshot text,
  changed_at timestamptz not null default now()
);

create index if not exists team_visibility_audit_user_changed_idx
  on public.team_visibility_audit (user_id, changed_at desc);
create index if not exists team_visibility_audit_changed_idx
  on public.team_visibility_audit (changed_at desc);

alter table public.team_visibility_audit enable row level security;

drop policy if exists "team_visibility_audit admin select" on public.team_visibility_audit;
create policy "team_visibility_audit admin select"
  on public.team_visibility_audit
  for select
  using (is_admin());

drop policy if exists "team_visibility_audit admin insert" on public.team_visibility_audit;
create policy "team_visibility_audit admin insert"
  on public.team_visibility_audit
  for insert
  with check (is_admin());

-- Trigger: every UPDATE on public.users that flips public_team writes
-- one audit row. Captures both the user's name (in case the row is
-- later deleted) and who flipped them via auth.uid().
create or replace function public.log_team_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
begin
  if (coalesce(old.public_team, null) is distinct from coalesce(new.public_team, null)) then
    select full_name into actor_name from public.users where id = actor_id;
    insert into public.team_visibility_audit(
      user_id, user_name_snapshot, old_value, new_value,
      changed_by, changed_by_name_snapshot
    )
    values (
      new.id, new.full_name, old.public_team, new.public_team,
      actor_id, actor_name
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_team_visibility_change_trg on public.users;
create trigger log_team_visibility_change_trg
  after update of public_team on public.users
  for each row
  execute function public.log_team_visibility_change();
