-- Capture what /api/fal/video/status sees on each poll so the
-- gallery can explain "stuck in queue" instead of just spinning.
-- Stored on the row itself (not a side table) — scoped per-video,
-- always overwritten by the latest poll, no historical retention
-- needed. Mirrors the call_ai_scores.debug_info pattern.
alter table public.site_videos
  add column if not exists debug_info jsonb;

comment on column public.site_videos.debug_info is
  'Last poll''s context: { last_polled_at, fal_status, fal_status_http, fal_logs, queued_for_seconds, app_id, request_id }. Set by /api/fal/video/status.';
