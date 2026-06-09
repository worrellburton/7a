-- Tiny key/value store for runtime feature flags.
-- The social-media posting kill-switch lands here as
-- key='social_posting_enabled' with value=true|false.
-- Reads via the standard supabase client; writes restricted
-- to super admins.

create table if not exists public.app_flags (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.app_flags enable row level security;

drop policy if exists app_flags_read on public.app_flags;
create policy app_flags_read on public.app_flags
  for select to authenticated using (true);

drop policy if exists app_flags_super_admin_write on public.app_flags;
create policy app_flags_super_admin_write on public.app_flags
  for all to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_super_admin = true))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_super_admin = true));

-- Seed the social-posting flag in the OFF position. The user asked
-- for posting to be paused; flipping the toggle in /app/social-media
-- flips this row.
insert into public.app_flags (key, value)
values ('social_posting_enabled', 'false'::jsonb)
on conflict (key) do nothing;
