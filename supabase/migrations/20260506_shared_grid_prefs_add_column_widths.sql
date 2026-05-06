-- Add a jsonb map of column-key -> width(px) to the shared grid
-- prefs table so the outreach (and other shared grids) can persist
-- per-column widths org-wide. Defaults to empty so existing rows /
-- absent rows keep current behaviour. Realtime publication already
-- covers this table, so updates fan out without further changes.
alter table public.shared_grid_prefs
  add column if not exists column_widths jsonb not null default '{}'::jsonb;
