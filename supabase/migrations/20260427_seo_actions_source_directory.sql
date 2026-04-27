-- Allow auto-logging when someone saves a live URL on a directory.
-- The Directories page upserts an action by source_directory_id, so
-- a re-save doesn't pile up duplicates. Source ids match the curated
-- DIRECTORIES list in src/app/app/seo/directories/content.tsx
-- ("psychology-today-rehab", "yelp", etc.) — free-form text rather
-- than an FK because the curated list is in TS, not the DB.
alter table public.seo_actions
  add column if not exists source_directory_id text;

create unique index if not exists seo_actions_source_directory_id_uniq
  on public.seo_actions (source_directory_id)
  where source_directory_id is not null;
