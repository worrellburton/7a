-- "Other" catch-all category for the Add Directory form on
-- /app/seo/directories. The original CHECK constraint pinned the
-- column to the 10 curated categories; adding 'other' lets admins
-- file a directory that genuinely doesn't fit any of them without
-- forcing the curated taxonomy.

alter table public.seo_custom_directories
  drop constraint if exists seo_custom_directories_category_check;

alter table public.seo_custom_directories
  add constraint seo_custom_directories_category_check
  check (category in (
    'national','insurance','mental_health','healthcare','review',
    'arizona','recovery','specialty','professional','business','other'
  ));
