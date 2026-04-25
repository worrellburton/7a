-- Add SEO metadata to site_videos so the gallery can run an
-- "SEO Video" pass identical in spirit to the existing SEO Images
-- flow (alt + title + description, generated from the video's
-- prompt and metadata).
alter table public.site_videos
  add column if not exists alt text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_processed_at timestamptz;

comment on column public.site_videos.alt is
  'Short alt text for the gallery thumbnail and downstream embeds.';
comment on column public.site_videos.seo_title is
  'Title used in og:title / video schema markup when this clip is embedded on the public site.';
comment on column public.site_videos.seo_description is
  'Long-form description used for og:description / video schema.';
comment on column public.site_videos.seo_processed_at is
  'Last time the SEO suggestions were written. NULL = never optimized; surfaces the row in the "SEO Video" run-all batch.';
