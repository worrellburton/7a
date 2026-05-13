-- Phase 1 of the sidebar recency overhaul. Two columns on the
-- users table track per-user click history so each rep ends up
-- with their own ordering and only crosses the "recency mode"
-- threshold after their own 10 clicks.
--
--   sidebar_recent_paths : ordered list of recently-clicked
--                          sidebar paths, newest first. Deduped
--                          server-side on every visit. Capped to
--                          30 entries so a long career on the
--                          platform doesn't bloat the row.
--   sidebar_click_count  : monotonically increasing total of
--                          sidebar clicks. Drives the < 10
--                          (alpha mode) vs >= 10 (recency mode)
--                          UI flip in Phase 7.
--
-- Both columns default to safe empty values so existing rows
-- are immediately consistent without a backfill.

alter table public.users
  add column if not exists sidebar_recent_paths text[] not null default '{}';

alter table public.users
  add column if not exists sidebar_click_count integer not null default 0;
