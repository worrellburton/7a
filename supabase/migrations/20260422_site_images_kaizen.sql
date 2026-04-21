-- Extra columns on site_images for the Images admin page:
--   rating            : 0-5 star rating (0 = unrated)
--   seo_title         : optional marketing title suggested by "Kaizen Images"
--   seo_description   : optional marketing description
--   kaizen_processed_at
--                     : timestamp of the most recent Kaizen pass so we can
--                       show "already optimized" and skip repeats by default
--   original_filename : the user-facing name we uploaded as; keeps a
--                       breadcrumb even after a Kaizen rename
ALTER TABLE public.site_images
  ADD COLUMN IF NOT EXISTS rating smallint NOT NULL DEFAULT 0
    CHECK (rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS kaizen_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_filename text;

CREATE INDEX IF NOT EXISTS site_images_rating_idx
  ON public.site_images (rating DESC);
