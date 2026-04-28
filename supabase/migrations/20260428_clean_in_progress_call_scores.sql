-- One-time cleanup: nuke AI score rows that were generated against
-- a still-in-progress call. Two markers identify them reliably:
--   1. The metadata-only prompt forces summary to start with
--      "No audio available; analysis is metadata-only." (see
--      src/app/api/claude/calls/score/route.ts buildPrompt).
--   2. Older rows wrote call_name placeholders like "Outbound call -
--      in progress" / "In-progress GBP inbound call" before the
--      route's in-progress guard existed.
--
-- We only delete rows whose corresponding call HAS audio now — i.e.
-- the recording has landed and re-scoring will succeed. Calls that
-- truly have no recording (voicemail-only, ringless missed) stay
-- on their metadata-only score; nuking those would just churn.

delete from public.call_ai_scores ais
using public.calls c
where ais.call_id = c.ctm_id
  and c.audio_url is not null
  and (
    ais.summary ilike 'No audio available%'
    or ais.call_name ilike '%in progress%'
    or ais.call_name ilike '%in-progress%'
  );

-- Also flag those calls for auto-rescore on the next worker tick
-- so the user doesn't have to manually click Re-analyze.

update public.calls c
set needs_score = true,
    score_attempts = 0,
    audio_retry_count = 0,
    audio_retry_after = null
where c.audio_url is not null
  and not exists (
    select 1 from public.call_ai_scores ais where ais.call_id = c.ctm_id
  );
