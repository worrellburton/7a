-- Round-2 perf pass. Applied via MCP on 2026-06-10.

-- PageViewers polls every 30s on every /app/* route with
--   .eq('last_path', pathname) .gte('last_seen_at', now-3m)
-- Compound index serves the equality + range in one walk. Partial
-- on last_seen_at IS NOT NULL because rows without it can never
-- match the gte().
CREATE INDEX IF NOT EXISTS users_last_path_last_seen_at_idx
  ON public.users (last_path, last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

-- Cron observability: every cron invocation writes a cron_runs row
-- with no retention policy anywhere. With scheduled-send firing
-- every minute that grows >500k rows/year and progressively slows
-- the admin health dashboard. Prune anything older than 90 days.
-- (Going forward we also drop the noisiest no-op writes — see
-- /lib/cron-observability.ts.)
DELETE FROM public.cron_runs
  WHERE started_at < now() - interval '90 days';
