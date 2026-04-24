-- Audio-retry book-keeping for calls whose recording wasn't ready
-- when the score endpoint first tried to fetch it. Instead of
-- writing a low-confidence metadata-only score and giving up, the
-- scorer now bumps audio_retry_count + audio_retry_after, and the
-- /api/calls/auto-score cron picks the row up later for another
-- attempt. Falls through to metadata-only after AUDIO_MAX_RETRIES
-- (~7 hours of backoff) so the row never gets stuck in pending.
alter table public.calls
  add column if not exists audio_retry_count smallint not null default 0,
  add column if not exists audio_retry_after timestamptz,
  add column if not exists audio_last_error text;

create index if not exists calls_audio_retry_after_idx
  on public.calls (audio_retry_after)
  where audio_retry_after is not null;
