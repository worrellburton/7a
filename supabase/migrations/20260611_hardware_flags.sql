-- Hardware check-in flags: a user taps "This isn't right" on a piece
-- of hardware assigned to them; the row surfaces as a red alert on
-- the Hardware page until an admin resolves it. The home chip and
-- hardware page were already coded against this table — it was never
-- created, so every flag failed with "table not found".
-- (Applied via MCP on 2026-06-11; committed here for reproducibility.)

create table if not exists public.hardware_flags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.hardware_items(id) on delete cascade,
  flagged_by uuid references public.users(id) on delete set null,
  reported_assigned_to text,
  message text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists hardware_flags_item_idx on public.hardware_flags (item_id);
create index if not exists hardware_flags_status_idx on public.hardware_flags (status);

alter table public.hardware_flags enable row level security;

-- Any signed-in staff member can see open flags (the hardware page is
-- staff-wide) and file one for themselves; resolving is also open to
-- staff because the hardware page lets any viewer clear stale alerts.
drop policy if exists hardware_flags_select on public.hardware_flags;
create policy hardware_flags_select on public.hardware_flags
  for select to authenticated using (true);

drop policy if exists hardware_flags_insert on public.hardware_flags;
create policy hardware_flags_insert on public.hardware_flags
  for insert to authenticated with check (flagged_by = auth.uid());

drop policy if exists hardware_flags_update on public.hardware_flags;
create policy hardware_flags_update on public.hardware_flags
  for update to authenticated using (true);

-- Realtime: the hardware page subscribes to postgres_changes on this
-- table so red banners appear/clear live.
do $$
begin
  alter publication supabase_realtime add table public.hardware_flags;
exception when duplicate_object then null;
end $$;
