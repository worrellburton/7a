-- Hardware assignment-check flags. Powers the home-screen Hardware
-- pill and its "This isn't right" report flow. Any signed-in user
-- can file a flag against an item that's incorrectly assigned to
-- them (or assigned to a teammate); admins triage on the Hardware
-- page where unresolved flags surface inline as red banners on the
-- affected rows.

create table if not exists public.hardware_flags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.hardware_items(id) on delete cascade,
  flagged_by uuid references public.users(id),
  -- 'open' until an admin clears it, then 'resolved'. The home
  -- pill only counts open flags; the Hardware-page alert chip
  -- offers a "mark resolved" affordance that flips this.
  status text not null default 'open' check (status in ('open', 'resolved')),
  -- Optional free-text the reporter typed. Most flags will just
  -- be "wrong assignee" — the message is left blank in that case.
  message text,
  -- Snapshot of the row's assigned_to value AT THE TIME OF FLAG so
  -- an admin investigating later can see what the reporter saw,
  -- even if the row's been reassigned since.
  reported_assigned_to text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

create index if not exists hardware_flags_item_idx on public.hardware_flags (item_id);
create index if not exists hardware_flags_status_idx on public.hardware_flags (status);
create index if not exists hardware_flags_flagged_by_idx on public.hardware_flags (flagged_by);

alter table public.hardware_flags enable row level security;

drop policy if exists hardware_flags_select on public.hardware_flags;
create policy hardware_flags_select
  on public.hardware_flags for select
  to authenticated using (true);

-- Anyone signed in can file a flag — that's the point of the
-- home-screen check-in. We bind flagged_by to auth.uid() inside
-- with check so users can't impersonate someone else's flag.
drop policy if exists hardware_flags_insert on public.hardware_flags;
create policy hardware_flags_insert
  on public.hardware_flags for insert
  to authenticated
  with check (flagged_by = auth.uid());

-- Only admins resolve flags. Users can't edit / delete their own
-- post-hoc; if they want to retract one they ask an admin.
drop policy if exists hardware_flags_update on public.hardware_flags;
create policy hardware_flags_update
  on public.hardware_flags for update
  to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

drop policy if exists hardware_flags_delete on public.hardware_flags;
create policy hardware_flags_delete
  on public.hardware_flags for delete
  to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

alter publication supabase_realtime add table public.hardware_flags;
