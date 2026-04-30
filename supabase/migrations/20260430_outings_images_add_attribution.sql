-- Add provenance + license columns so the marketing card overlay can
-- render proper attribution for each public-domain / CC photo. The
-- existing `source_prompt` was specific to the AI-gen flow; we keep
-- it (nullable) for backward compat but real-photo rows leave it
-- null and populate the four new columns instead.
ALTER TABLE public.outings_images
  ALTER COLUMN source_prompt DROP NOT NULL;

ALTER TABLE public.outings_images
  ADD COLUMN IF NOT EXISTS credit text,
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS source_url text;
