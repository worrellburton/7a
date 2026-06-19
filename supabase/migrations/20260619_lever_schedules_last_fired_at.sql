-- Watermark for the log-report (and any future lever) cron so a
-- weekly send fires once per scheduled occurrence even when Vercel's
-- hourly cron tick drifts past the exact hour. The cron claims the
-- occurrence by advancing last_fired_at; a missed top-of-hour run is
-- caught up by the next tick within the catch-up window instead of
-- silently skipping the whole week.
alter table public.lever_schedules
  add column if not exists last_fired_at timestamptz;
