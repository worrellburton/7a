-- Media-recency: every time a user picks an image or video in
-- ANY surface (social-media Build, content editor, email-campaign
-- builder, MediaPicker, etc.) we bump last_used_at. The library
-- query orders by last_used_at desc, then created_at desc, so
-- frequently-used assets float to the top across every surface.

alter table public.site_images
  add column if not exists last_used_at timestamptz;

alter table public.site_videos
  add column if not exists last_used_at timestamptz;

create index if not exists site_images_last_used_idx
  on public.site_images (last_used_at desc nulls last);
create index if not exists site_videos_last_used_idx
  on public.site_videos (last_used_at desc nulls last);
