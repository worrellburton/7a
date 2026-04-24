-- Profile editor (and the public team page) reads `hometown` and
-- `interesting_facts` on the `users` row. Those columns were never
-- added to the deployed schema, so `EXTENDED_SELECT` in lib/team.ts
-- failed and the code silently fell back to a minimal select that
-- doesn't include `favorite_quote`, `favorite_seven_arrows`, or
-- `team_page_order` — which is why
--   * the Favorites section never appeared on the public page,
--   * and admin-set order was being ignored.
alter table public.users
  add column if not exists hometown text,
  add column if not exists interesting_facts jsonb not null default '[]'::jsonb;
