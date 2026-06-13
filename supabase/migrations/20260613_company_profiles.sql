-- Company pages. A "company" is the normalized company string shared
-- by a cluster of contacts (contacts.company is free text — there is
-- no companies table). company_profiles holds the EDITABLE metadata
-- for a company keyed by that normalized name; membership is always
-- computed live from contacts, so this table never needs backfilling
-- and a company page works the instant a contact carries the name.
-- (Applied via MCP on 2026-06-13; committed here for reproducibility.)

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_key text not null unique,
  display_name text not null,
  slug text not null unique,
  notes text,
  owner_id uuid references public.users(id) on delete set null,
  follow_up_at timestamptz,
  promoted_partner_id uuid references public.partners(id) on delete set null,
  promoted_at timestamptz,
  promoted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_profiles_slug_idx on public.company_profiles (slug);

alter table public.company_profiles enable row level security;

drop policy if exists company_profiles_select on public.company_profiles;
create policy company_profiles_select on public.company_profiles
  for select to authenticated using (true);

drop policy if exists company_profiles_write on public.company_profiles;
create policy company_profiles_write on public.company_profiles
  for all to authenticated using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.company_profiles;
exception when duplicate_object then null;
end $$;

create or replace function public.touch_company_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_company_profiles_updated_at on public.company_profiles;
create trigger trg_company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function public.touch_company_profiles_updated_at();
