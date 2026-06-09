-- Alumni portal foundation tables. Phase 1: profile + meetups +
-- resources + stories + scholarships (the read/write tables; the
-- consumer pages ship across Phase 1-3 in /app/alumni/*).
--
-- Privacy model:
--   - Every alumni starts with NO opt-ins. on_map + on_phone_list
--     default false. Surfacing happens only when the user
--     explicitly toggles them on via the profile editor.
--   - phone_visible + email_visible are independent gates so a
--     user can be on the map without revealing contact details.

create table if not exists public.alumni_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  sobriety_date date,
  city text,
  state text,
  lat double precision,
  lng double precision,
  bio text check (char_length(bio) <= 600),
  interests text[] not null default '{}',
  available_for text[] not null default '{}',
  phone text,
  email_for_alumni text,
  on_map boolean not null default false,
  on_phone_list boolean not null default false,
  phone_visible boolean not null default false,
  email_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists alumni_profiles_set_updated_at on public.alumni_profiles;
create trigger alumni_profiles_set_updated_at
  before update on public.alumni_profiles
  for each row execute function public.set_updated_at();

alter table public.alumni_profiles enable row level security;
drop policy if exists alumni_profiles_select_own on public.alumni_profiles;
create policy alumni_profiles_select_own on public.alumni_profiles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists alumni_profiles_select_opted_in on public.alumni_profiles;
create policy alumni_profiles_select_opted_in on public.alumni_profiles
  for select to authenticated using (on_map = true or on_phone_list = true);
drop policy if exists alumni_profiles_select_admin on public.alumni_profiles;
create policy alumni_profiles_select_admin on public.alumni_profiles
  for select to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_super_admin = true))
  );
drop policy if exists alumni_profiles_upsert_own on public.alumni_profiles;
create policy alumni_profiles_upsert_own on public.alumni_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists alumni_profiles_on_map_idx on public.alumni_profiles (on_map) where on_map = true;
create index if not exists alumni_profiles_on_phone_list_idx on public.alumni_profiles (on_phone_list) where on_phone_list = true;

create table if not exists public.alumni_meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time text,
  city text,
  state text,
  region text,
  rsvp_url text,
  survey_url text,
  is_published boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists alumni_meetups_set_updated_at on public.alumni_meetups;
create trigger alumni_meetups_set_updated_at
  before update on public.alumni_meetups
  for each row execute function public.set_updated_at();
alter table public.alumni_meetups enable row level security;
drop policy if exists alumni_meetups_select_published on public.alumni_meetups;
create policy alumni_meetups_select_published on public.alumni_meetups
  for select to authenticated using (is_published = true);
drop policy if exists alumni_meetups_admin_all on public.alumni_meetups;
create policy alumni_meetups_admin_all on public.alumni_meetups
  for all to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_super_admin = true))
  );
create index if not exists alumni_meetups_event_date_idx on public.alumni_meetups (event_date);

create table if not exists public.alumni_resources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('book','webinar','therapy_group','hobby','outlet')),
  title text not null,
  description text,
  url text,
  author_or_host text,
  tags text[] not null default '{}',
  submitted_by uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists alumni_resources_set_updated_at on public.alumni_resources;
create trigger alumni_resources_set_updated_at
  before update on public.alumni_resources
  for each row execute function public.set_updated_at();
alter table public.alumni_resources enable row level security;
drop policy if exists alumni_resources_select_published on public.alumni_resources;
create policy alumni_resources_select_published on public.alumni_resources
  for select to authenticated using (status = 'published' or submitted_by = auth.uid());
drop policy if exists alumni_resources_insert_own on public.alumni_resources;
create policy alumni_resources_insert_own on public.alumni_resources
  for insert to authenticated with check (submitted_by = auth.uid());
drop policy if exists alumni_resources_admin_all on public.alumni_resources;
create policy alumni_resources_admin_all on public.alumni_resources
  for all to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_super_admin = true))
  );

create table if not exists public.alumni_stories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('voice','staff_talk')),
  title text not null,
  body text,
  media_url text,
  submitted_by uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists alumni_stories_set_updated_at on public.alumni_stories;
create trigger alumni_stories_set_updated_at
  before update on public.alumni_stories
  for each row execute function public.set_updated_at();
alter table public.alumni_stories enable row level security;
drop policy if exists alumni_stories_select_published on public.alumni_stories;
create policy alumni_stories_select_published on public.alumni_stories
  for select to authenticated using (status = 'published' or submitted_by = auth.uid());
drop policy if exists alumni_stories_insert_own on public.alumni_stories;
create policy alumni_stories_insert_own on public.alumni_stories
  for insert to authenticated with check (submitted_by = auth.uid());
drop policy if exists alumni_stories_admin_all on public.alumni_stories;
create policy alumni_stories_admin_all on public.alumni_stories
  for all to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_super_admin = true))
  );

create table if not exists public.alumni_scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  eligibility text,
  deadline date,
  contact_user_id uuid references public.users(id) on delete set null,
  contact_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists alumni_scholarships_set_updated_at on public.alumni_scholarships;
create trigger alumni_scholarships_set_updated_at
  before update on public.alumni_scholarships
  for each row execute function public.set_updated_at();
alter table public.alumni_scholarships enable row level security;
drop policy if exists alumni_scholarships_select_active on public.alumni_scholarships;
create policy alumni_scholarships_select_active on public.alumni_scholarships
  for select to authenticated using (is_active = true);
drop policy if exists alumni_scholarships_admin_all on public.alumni_scholarships;
create policy alumni_scholarships_admin_all on public.alumni_scholarships
  for all to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_super_admin = true))
  );

-- Let any authenticated user propose a meetup (lands in the
-- moderation queue with is_published=false). Authors can also see
-- their own pending proposal so the UI confirms submission.
drop policy if exists alumni_meetups_propose on public.alumni_meetups;
create policy alumni_meetups_propose on public.alumni_meetups
  for insert to authenticated
  with check (is_published = false and created_by = auth.uid());

drop policy if exists alumni_meetups_select_own_pending on public.alumni_meetups;
create policy alumni_meetups_select_own_pending on public.alumni_meetups
  for select to authenticated using (created_by = auth.uid());
