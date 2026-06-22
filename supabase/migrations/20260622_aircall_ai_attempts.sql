-- Bounded-retry counter for the Aircall AI backfill.
--
-- Previously the backfill stamped ai_synced_at the first time it pulled
-- Aircall's AI endpoints and never retried. Combined with a candidate
-- window measured from the call's START (not its END), long calls became
-- candidates while still in progress: we pulled an empty AI blob, stamped
-- it, and permanently lost the transcript (and therefore the summary) for
-- 15-20 minute admissions calls.
--
-- ai_attempts lets the job retry empty-blob calls a bounded number of
-- times (paired with an ended_at-based readiness gate in the route) so a
-- slow Aircall transcription is recovered instead of stamped-and-forgotten,
-- while a call Aircall genuinely never transcribes is not re-fetched forever.
alter table public.aircall_calls
  add column if not exists ai_attempts smallint not null default 0;

comment on column public.aircall_calls.ai_attempts is
  'Number of times the backfill-ai job pulled Aircall AI for this call and still found no transcript. Bounds retries so a call Aircall never transcribes is not re-fetched forever. Reset to 0 (with ai_synced_at = null) to force a fresh re-pull.';
