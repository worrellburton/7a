-- Shared self-timing for the email builder's progress bar. Every
-- completed build/iteration inserts its wall-time here; the progress
-- bar estimates from the median of recent rows (per mode) so the ETA
-- reflects real, recent, cross-device history instead of one
-- browser's localStorage.
create table if not exists public.email_build_timings (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('fresh', 'iterate')),
  duration_ms integer not null check (duration_ms > 0),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_build_timings_mode_created
  on public.email_build_timings (mode, created_at desc);

alter table public.email_build_timings enable row level security;

drop policy if exists "email_build_timings read authed" on public.email_build_timings;
create policy "email_build_timings read authed"
  on public.email_build_timings for select
  to authenticated
  using (true);

drop policy if exists "email_build_timings insert authed" on public.email_build_timings;
create policy "email_build_timings insert authed"
  on public.email_build_timings for insert
  to authenticated
  with check (true);
