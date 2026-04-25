-- Surface why an audio-first analysis fell back to metadata-only.
-- Stores the analyzer that ran, the audio download status, and any
-- error returned by the audio-first path (Gemini). Lets the UI
-- explain "audio downloaded fine but Gemini errored on a 38-min
-- call" instead of the generic "no audio available" banner.
alter table public.call_ai_scores
  add column if not exists debug_info jsonb;

comment on column public.call_ai_scores.debug_info is
  'Diagnostic context from the last scoring run: { audio_status, analyzer, analyzer_error }. Set by /api/claude/calls/score.';
