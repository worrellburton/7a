-- Persist AI scoring errors on the calls row so failed Gemini analyses
-- have a visible trace. Previously, when /api/claude/calls/score
-- returned a non-2xx (bad key, model unreachable, parse failure,
-- quota), the auto-score cron silently incremented score_attempts and
-- moved on — a failed call looked identical to a pending one in the
-- UI and in the DB. With the audit we just ran on the pipeline we can
-- now record the exact reason so an admin can diagnose without
-- re-running the scorer and reading 502s by hand.
--
-- score_error holds the most recent failure message (trimmed). It's
-- cleared whenever needs_score flips to false after a successful run.
-- score_errored_at is the timestamp of the last failure.

alter table public.calls add column if not exists score_error text;
alter table public.calls add column if not exists score_errored_at timestamptz;
