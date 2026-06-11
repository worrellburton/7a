-- Per-org ordering for the partners page's type cards (each partner
-- type renders as its own sheet/card; this column drives top-to-bottom
-- priority). Mirrors hardware_type_order: anyone signed in can read,
-- writes for any authenticated user (the partners grid is already
-- org-shared and editable by the team), realtime so every open tab
-- reorders live.
create table if not exists public.partner_type_order (
  type text primary key,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.partner_type_order enable row level security;

drop policy if exists partner_type_order_read on public.partner_type_order;
create policy partner_type_order_read on public.partner_type_order
  for select to authenticated using (true);

drop policy if exists partner_type_order_write on public.partner_type_order;
create policy partner_type_order_write on public.partner_type_order
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partner_type_order'
  ) then
    execute 'alter publication supabase_realtime add table public.partner_type_order';
  end if;
end $$;

-- Seed the canonical order so the first paint matches today's layout.
insert into public.partner_type_order (type, sort_order) values
  ('Detox', 0), ('RTC', 1), ('Outpatient', 2), ('Extended Care', 3),
  ('Interventionist', 4), ('Therapist', 5)
on conflict (type) do nothing;
