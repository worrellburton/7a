-- Drop the two AI tables that backed call scoring + per-thread scoring.
--
--   public.call_ai_scores    : one row per (call_id, scored_at) — the
--                              Gemini-transcription + Claude-analysis
--                              output for each call. ~376 rows on
--                              this project at teardown time. Joined
--                              by every AI feature (list view, detail
--                              view, recovery-com report). All
--                              consumers are gone — phases 3-7
--                              already stripped them.
--   public.text_thread_scores: same shape but for SMS threads. Was
--                              not in active use (0 rows) but the
--                              code path that populated it has been
--                              removed.
--
-- All seven AI columns that lived on public.calls were dropped in the
-- companion migration 20260507_drop_call_ai_scores_columns.sql.
--
-- We don't try to preserve the data; the user explicitly asked to
-- "delete all of this from the db from history". Anyone who needs the
-- old scores can read them out of a backup (Supabase keeps PITR).

DROP TABLE IF EXISTS public.call_ai_scores CASCADE;
DROP TABLE IF EXISTS public.text_thread_scores CASCADE;
