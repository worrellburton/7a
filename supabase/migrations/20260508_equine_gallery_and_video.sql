-- Phase 2/10 of the equine-assisted page upgrade. Each horse gets
-- room for a portrait gallery (multiple shots beyond the single
-- canonical image_url) and an optional short clip we can feature
-- on the marketing page. Both are nullable / empty by default so
-- the existing roster keeps rendering exactly as it does today;
-- the new fields only light up additional UI when populated.
ALTER TABLE public.equine
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN public.equine.gallery_urls IS
  'Additional portrait photos beyond image_url. Used by the public marketing page''s horse-detail modal as a carousel and by the featured-horse spotlight on /our-program/equine-assisted.';
COMMENT ON COLUMN public.equine.video_url IS
  'Optional short clip of the horse — fed to the public marketing page''s "Watch the herd" video reel section. Original (non-bling) footage only.';
