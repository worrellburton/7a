-- Radio: staff-facing station at /feather/radio.
--
--   1. `radio_songs` — one row per uploaded MP3. Any signed-in user
--      can read (the whole staff listens); only super admins can
--      insert / update / delete.
--   2. A public `radio` storage bucket holding the MP3 files. Public
--      read (the <audio> tag streams the public URL), super-admin-only
--      insert + delete.
--   3. Registers /feather/radio in page_permissions so the sidebar +
--      /feather/admin/pages editor can see it.

create table if not exists public.radio_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  filename text not null,
  storage_path text not null,
  public_url text not null,
  duration_seconds numeric,
  size_bytes bigint,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_radio_songs_created_at on public.radio_songs (created_at);

alter table public.radio_songs enable row level security;

drop policy if exists "radio_songs read for authenticated" on public.radio_songs;
create policy "radio_songs read for authenticated"
  on public.radio_songs for select
  to authenticated
  using (true);

drop policy if exists "radio_songs write for super admins" on public.radio_songs;
create policy "radio_songs write for super admins"
  on public.radio_songs for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

-- ----- Storage bucket -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'radio',
  'radio',
  true,
  52428800, -- 50 MB per track
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do nothing;

drop policy if exists "radio read public" on storage.objects;
create policy "radio read public"
  on storage.objects for select
  using (bucket_id = 'radio');

drop policy if exists "radio insert super admin" on storage.objects;
create policy "radio insert super admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'radio'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

drop policy if exists "radio delete super admin" on storage.objects;
create policy "radio delete super admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'radio'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

-- ----- Sidebar registration -----
insert into page_permissions (path, admin_only, alumni_only, section, sort_order, allowed_departments)
values ('/feather/radio', false, false, 'nav', 19.5, '{}'::uuid[])
on conflict (path) do update
  set admin_only = excluded.admin_only,
      alumni_only = excluded.alumni_only,
      section = excluded.section,
      sort_order = excluded.sort_order;
