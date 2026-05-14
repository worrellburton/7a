-- Hardware page · Phase 1 · base schema
--
-- See content.tsx for the consumer. One row per physical asset
-- (laptop, monitor, dock, etc.). value_price_cents stores cents to
-- avoid float drift in totals; NULL = unknown / "missing".

create table if not exists public.hardware_items (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  type_index integer,
  is_personal_computer boolean not null default false,
  model text not null default '',
  assigned_to text,
  location text,
  value_price_cents integer,
  status text,
  account text,
  pin text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hardware_items_type_idx on public.hardware_items (type);
create index if not exists hardware_items_assigned_idx on public.hardware_items (assigned_to);
create index if not exists hardware_items_location_idx on public.hardware_items (location);

alter table public.hardware_items enable row level security;

drop policy if exists hardware_items_select on public.hardware_items;
create policy hardware_items_select
  on public.hardware_items for select
  to authenticated using (true);

drop policy if exists hardware_items_insert on public.hardware_items;
create policy hardware_items_insert
  on public.hardware_items for insert
  to authenticated
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

drop policy if exists hardware_items_update on public.hardware_items;
create policy hardware_items_update
  on public.hardware_items for update
  to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

drop policy if exists hardware_items_delete on public.hardware_items;
create policy hardware_items_delete
  on public.hardware_items for delete
  to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

alter publication supabase_realtime add table public.hardware_items;
