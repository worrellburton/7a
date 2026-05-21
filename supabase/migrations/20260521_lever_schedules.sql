-- Per-lever broadcast schedule. The 🪵 Log Report lever, the
-- JD-reminder lever, and any future broadcast lever can each carry
-- one schedule row that the cron endpoint reads when deciding
-- whether to fire on a given run.
--
-- Cron strategy: Vercel runs /api/cron/levers/* every hour at the
-- top of the hour. The endpoint reads its row and only sends when
-- (current UTC weekday == day_of_week) AND (current UTC hour ==
-- hour_utc). day_of_week is 0..6 with 0 = Sunday, matching
-- JavaScript's Date.getUTCDay().
--
-- One row per lever_type (unique constraint). enabled=false leaves
-- the row but pauses the auto-fire — the manual lever pull on
-- /app/levers still works independently.

create table if not exists public.lever_schedules (
  id uuid primary key default gen_random_uuid(),
  lever_type text not null unique,
  enabled boolean not null default true,
  day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6),
  hour_utc int not null check (hour_utc >= 0 and hour_utc <= 23),
  -- Display-only — the cron matcher works off UTC values. We
  -- store the picker's source timezone so a different teammate
  -- opening the schedule sees the same human-readable time.
  display_timezone text not null default 'America/Phoenix',
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists lever_schedules_set_updated_at on public.lever_schedules;
create trigger lever_schedules_set_updated_at
  before update on public.lever_schedules
  for each row execute function public.set_updated_at();

alter table public.lever_schedules enable row level security;

-- Admins can read; only super admins can write. RLS doesn't apply
-- to the service-role client the API routes use (gating happens
-- at the route level) but we expose a SELECT policy so a logged-in
-- admin can read the row directly from the browser without going
-- through an endpoint.
drop policy if exists lever_schedules_select on public.lever_schedules;
create policy lever_schedules_select on public.lever_schedules
  for select to authenticated using (true);

-- Seed the log-report schedule with the same Monday 01:00 UTC
-- Sunday-6pm-Phoenix slot the hard-coded vercel.json cron used
-- before the schedule UI shipped, so the lever keeps firing on
-- the same beat after the migration applies.
insert into public.lever_schedules (lever_type, enabled, day_of_week, hour_utc, display_timezone)
values ('log-report', true, 1, 1, 'America/Phoenix')
on conflict (lever_type) do nothing;
