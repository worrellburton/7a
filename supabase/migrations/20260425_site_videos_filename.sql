-- Persist the original filename users upload (or "Generated" derived
-- name for fal jobs) so the gallery card can show "Mountains-to-
-- Lodge.mp4" instead of just "No prompt" + a UUID. Mirrors the
-- `filename` column on site_images.
alter table public.site_videos
  add column if not exists filename text;

comment on column public.site_videos.filename is
  'Original or display filename. Set by /api/fal/video/sign-upload from the uploader; null on legacy rows.';
