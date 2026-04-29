-- Drop the `behavior` column from public.equine. Leadership flagged
-- it as unhelpful in practice — short tags like "Sensitive / Spooky /
-- Good" weren't actionable on the roster card and clinicians keep the
-- nuance in `notes` / `internal_info` instead. Behavior strings live
-- only as transient text so dropping the column is safe.
alter table public.equine drop column if exists behavior;
