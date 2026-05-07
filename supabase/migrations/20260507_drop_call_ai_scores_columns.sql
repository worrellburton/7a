-- Drop the AI-only columns that the call-AI scorer used to track its
-- own queue + retry state on public.calls. Every column being removed
-- here was set by the deleted /api/calls/auto-score worker or the
-- deleted /api/claude/calls/score route — none of them are CTM data
-- and none survive the AI teardown.
--
--   needs_score           : true if the auto-scorer should pick up
--                           this row. Set by the CTM webhook when the
--                           call landed.
--   score_attempted_at    : last time the scorer tried this row.
--   score_attempts        : retry counter. Bumped on every attempt.
--   score_error           : last error string (parsed-out reason).
--   score_errored_at      : last time the scorer hit an error.
--   audio_retry_count     : number of times we've retried fetching the
--                           CTM recording audio for AI analysis.
--   audio_retry_after     : when the next audio retry is scheduled.
--   audio_last_error      : last fetch failure reason for audio.
--
-- All CTM-derived columns (ctm_id, audio_url, transcript_url, caller_*,
-- tracking_*, raw, etc.) are untouched.

ALTER TABLE public.calls DROP COLUMN IF EXISTS needs_score;
ALTER TABLE public.calls DROP COLUMN IF EXISTS score_attempted_at;
ALTER TABLE public.calls DROP COLUMN IF EXISTS score_attempts;
ALTER TABLE public.calls DROP COLUMN IF EXISTS score_error;
ALTER TABLE public.calls DROP COLUMN IF EXISTS score_errored_at;
ALTER TABLE public.calls DROP COLUMN IF EXISTS audio_retry_count;
ALTER TABLE public.calls DROP COLUMN IF EXISTS audio_retry_after;
ALTER TABLE public.calls DROP COLUMN IF EXISTS audio_last_error;
