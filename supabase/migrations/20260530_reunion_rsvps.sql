-- RSVPs for the alumni reunion event ("The Reunion at the Ranch").
-- One row per user; status is going / maybe / not_going (Partiful-
-- style). A single hard-coded event for now, so no separate events
-- table — if a second recurring event ever ships we'll generalize.
create table if not exists public.reunion_rsvps (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'not_going')),
  responded_at timestamptz not null default now()
);

create index if not exists reunion_rsvps_status_idx on public.reunion_rsvps (status);

alter table public.reunion_rsvps enable row level security;

drop policy if exists reunion_rsvps_select_authed on public.reunion_rsvps;
create policy reunion_rsvps_select_authed
  on public.reunion_rsvps for select to authenticated
  using (auth.uid() is not null);

drop policy if exists reunion_rsvps_upsert_own on public.reunion_rsvps;
create policy reunion_rsvps_upsert_own
  on public.reunion_rsvps for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reunion_rsvps_update_own on public.reunion_rsvps;
create policy reunion_rsvps_update_own
  on public.reunion_rsvps for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
