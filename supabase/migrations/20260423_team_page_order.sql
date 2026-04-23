-- Manually controllable display order for the public team page.
--
-- When NULL, `fetchPublicTeam()` falls back to the existing job-rank
-- sort so the column is safe to add at any time. Super admins can
-- override the order from /app/team (the "Team Page Order" modal).
-- Lower number = higher on the page.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS team_page_order integer;

-- Partial index — only rows with an explicit order are indexed, so we
-- pay no cost for the null majority.
CREATE INDEX IF NOT EXISTS users_team_page_order_idx
  ON public.users (team_page_order)
  WHERE team_page_order IS NOT NULL;
