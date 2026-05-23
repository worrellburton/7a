-- Append-only log of every cron-route invocation so silent
-- failures surface in the admin UI. The schema is intentionally
-- minimal: path, status, timing, an optional structured payload,
-- and a message field for human-readable error text.

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  status text not null check (status in ('ok','failed','error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cron_runs_path_started_idx
  on public.cron_runs (path, started_at desc);
create index if not exists cron_runs_status_started_idx
  on public.cron_runs (status, started_at desc)
  where status in ('failed', 'error');

comment on table public.cron_runs is
  'Append-only log of every cron route invocation. Lets the admin UI surface silent failures (route returns 200 but did nothing useful) and helps audit which scheduled job ran when.';

alter table public.cron_runs enable row level security;

drop policy if exists "cron_runs admins read" on public.cron_runs;
create policy "cron_runs admins read"
  on public.cron_runs
  for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and (u.is_admin = true or u.is_super_admin = true)
    )
  );
