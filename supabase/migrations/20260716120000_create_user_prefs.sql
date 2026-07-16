-- Generic per-user key/value preference store. First consumer: the
-- feather Home orbit 2D/3D mode toggle (key 'orbit_mode').
--
-- Applied to production via MCP on 2026-07-16; committed here so the
-- schema change is reproducible from source control.
create table if not exists public.user_prefs (
  user_id uuid not null references public.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_prefs enable row level security;

-- Owner-only access: a user can read and write only their own prefs.
drop policy if exists "user_prefs_select_own" on public.user_prefs;
create policy "user_prefs_select_own" on public.user_prefs
  for select using (auth.uid() = user_id);

drop policy if exists "user_prefs_insert_own" on public.user_prefs;
create policy "user_prefs_insert_own" on public.user_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_prefs_update_own" on public.user_prefs;
create policy "user_prefs_update_own" on public.user_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_prefs_delete_own" on public.user_prefs;
create policy "user_prefs_delete_own" on public.user_prefs
  for delete using (auth.uid() = user_id);
