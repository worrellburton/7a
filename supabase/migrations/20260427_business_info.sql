-- Canonical NAP / business info for the company. The team's source
-- of truth when filling out directory listings, Google Business
-- Profile, and any third-party form that asks for the basics.
--
-- Singleton row keyed by id='singleton' so we can `select … limit 1`
-- without juggling primary keys; on first read the API upserts the
-- row so the UI never sees a 404.
--
-- Surfaced at /app/seo/information.

create table if not exists public.business_info (
  id text primary key default 'singleton',
  -- NAP (name, address, phone) — the most-copied fields. Address is
  -- broken out into parts so each listing can format it however
  -- they want without us hand-parsing a single string.
  business_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text default 'United States',
  phone text,
  -- Essential
  website_url text,
  hours text,                  -- free-form ("Mon-Fri 9-5, Sat 10-2")
  business_category text,
  description text,            -- short blurb for "About" fields
  -- Rich media — public URLs (Supabase storage, S3, Imgur, whatever).
  -- text[] keeps the editor flexible (line per URL, no schema churn).
  logo_url text,
  photo_urls text[] not null default '{}',
  video_urls text[] not null default '{}',
  reviews_url text,
  -- Attributes (e.g. "Wheelchair accessible", "Veteran-owned").
  attributes text[] not null default '{}',
  -- Audit
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

drop trigger if exists business_info_set_updated_at on public.business_info;
create trigger business_info_set_updated_at
  before update on public.business_info
  for each row execute function public.set_updated_at();

alter table public.business_info enable row level security;

drop policy if exists business_info_select_admin on public.business_info;
create policy business_info_select_admin
  on public.business_info
  for select
  using (is_admin());

drop policy if exists business_info_write_admin on public.business_info;
create policy business_info_write_admin
  on public.business_info
  for all
  using (is_admin())
  with check (is_admin());

-- Realtime so two admins editing simultaneously see each other's
-- saves immediately.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'business_info'
  ) then
    execute 'alter publication supabase_realtime add table public.business_info';
  end if;
end $$;

-- Seed the singleton row so the page never has to handle a 0-row
-- case. All fields default to NULL / empty arrays; the team fills
-- them in via the UI.
insert into public.business_info (id) values ('singleton')
on conflict (id) do nothing;
