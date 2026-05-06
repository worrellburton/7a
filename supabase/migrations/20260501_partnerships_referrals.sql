-- Partnerships & Referrals — directory of clinical partners
-- (Detox/RTC/Outpatient/Extended Care + Interventionists, Therapists,
-- etc.) the admissions team coordinates with for referrals in and out.
-- The "Levels of Care" array only applies to facility-type partners
-- (Detox / RTC / Outpatient / Extended Care); the form hides the
-- input for the other types and stores null.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in (
    'Detox', 'RTC', 'Outpatient', 'Extended Care', 'Interventionist', 'Therapist'
  )),
  specialty text,
  location text,
  poc text,
  contact_info text,
  admissions_line text,
  cash_pay_rate numeric,
  insurance text[] not null default '{}',
  levels_of_care text[],
  website text,
  notes text,
  comments text,
  rep text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partners
  drop constraint if exists partners_levels_of_care_by_type_check;
alter table public.partners
  add constraint partners_levels_of_care_by_type_check
  check (
    case
      when type in ('Detox','RTC','Outpatient','Extended Care') then true
      else (levels_of_care is null or cardinality(levels_of_care) = 0)
    end
  );

create index if not exists partners_specialty_idx on public.partners(specialty);
create index if not exists partners_type_idx on public.partners(type);
create index if not exists partners_name_idx on public.partners(name);

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

drop policy if exists partners_select_authed on public.partners;
create policy partners_select_authed
  on public.partners for select to authenticated using (true);

drop policy if exists partners_write_authed on public.partners;
create policy partners_write_authed
  on public.partners for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partners'
  ) then
    execute 'alter publication supabase_realtime add table public.partners';
  end if;
end $$;

-- Org-wide grid preferences (column visibility + order). One singleton
-- row per "scope" so all users see the same view. Keyed by
-- scope = 'partners' for this page.
create table if not exists public.shared_grid_prefs (
  scope text primary key,
  visible_columns text[] not null default '{}',
  column_order text[] not null default '{}',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

drop trigger if exists shared_grid_prefs_set_updated_at on public.shared_grid_prefs;
create trigger shared_grid_prefs_set_updated_at
  before update on public.shared_grid_prefs
  for each row execute function public.set_updated_at();

alter table public.shared_grid_prefs enable row level security;

drop policy if exists shared_grid_prefs_select_authed on public.shared_grid_prefs;
create policy shared_grid_prefs_select_authed
  on public.shared_grid_prefs for select to authenticated using (true);

drop policy if exists shared_grid_prefs_write_authed on public.shared_grid_prefs;
create policy shared_grid_prefs_write_authed
  on public.shared_grid_prefs for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_grid_prefs'
  ) then
    execute 'alter publication supabase_realtime add table public.shared_grid_prefs';
  end if;
end $$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_info text,
  location text,
  notes text,
  source text,
  source_partner_id uuid references public.partners(id) on delete set null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

drop policy if exists contacts_select_authed on public.contacts;
create policy contacts_select_authed
  on public.contacts for select to authenticated using (true);

drop policy if exists contacts_write_authed on public.contacts;
create policy contacts_write_authed
  on public.contacts for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
