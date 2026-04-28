-- Track which admin has viewed which VOB submission so the "NEW"
-- status badge only appears for rows the current admin hasn't
-- already seen. The badge clears the next time they load the page.
--
-- Composite primary key (vob_id, user_id) makes the upsert
-- "INSERT … ON CONFLICT DO NOTHING" idempotent: marking a row as
-- seen multiple times in a session is a no-op.
--
-- ON DELETE CASCADE on both sides keeps the table tidy without a
-- janitor job — deleting a VOB or a user removes their view rows.

create table if not exists public.vob_views (
  vob_id uuid not null references public.vob_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (vob_id, user_id)
);

create index if not exists vob_views_user_idx on public.vob_views (user_id);

-- Allow the same admins who can read /api/website-requests/vobs to
-- read + write their own view rows. Service-role (used by the API)
-- bypasses RLS, so we don't strictly need policies for the current
-- code path, but enable RLS as a safety net in case the API ever
-- starts using a session client.

alter table public.vob_views enable row level security;

drop policy if exists vob_views_self_read on public.vob_views;
create policy vob_views_self_read on public.vob_views
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists vob_views_self_write on public.vob_views;
create policy vob_views_self_write on public.vob_views
  for insert to authenticated
  with check (user_id = auth.uid());
