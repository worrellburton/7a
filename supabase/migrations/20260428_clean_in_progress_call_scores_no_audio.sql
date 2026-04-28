-- Follow-up cleanup: some "in progress" placeholder names slipped
-- through the audio-only filter in the previous migration because
-- their call never got a recording (e.g. an 18-second hangup CTM
-- didn't bother to record). Their underlying metadata is still
-- finalized (duration>0, status not in /in.?progress|ringing|live|
-- active/i), so a metadata-only re-score will pick a sane name now
-- that the in-progress guard in /api/claude/calls/score is in place.

delete from public.call_ai_scores ais
using public.calls c
where ais.call_id = c.ctm_id
  and (ais.call_name ilike '%in progress%' or ais.call_name ilike '%in-progress%')
  and c.duration is not null
  and (c.status is null or c.status !~* 'in.?progress|ringing|live|active');

update public.calls c
set needs_score = true,
    score_attempts = 0,
    audio_retry_count = 0,
    audio_retry_after = null
where c.duration is not null
  and (c.status is null or c.status !~* 'in.?progress|ringing|live|active')
  and not exists (
    select 1 from public.call_ai_scores ais where ais.call_id = c.ctm_id
  );
