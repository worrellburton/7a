-- Outreach entries (press releases, guest posts, brand profiles,
-- forum/comment placements) had RLS hardcoded to (is_admin OR primary
-- department = '<SEO dept uuid>'). But PagePermissions lets users
-- reach /app/seo/* via four routes — primary dept, extra-dept grant,
-- per-user override, or admin — so users on the last two paths could
-- see the page, type a URL, click Add, and watch the insert fail
-- silently with no row created. Aligning RLS with the page-level
-- access gate: any authenticated user can manage entries; the
-- PagePermissions layer decides who reaches the screen in the first
-- place.
drop policy if exists seo_outreach_entries_select_admin on public.seo_outreach_entries;
drop policy if exists seo_outreach_entries_insert_admin on public.seo_outreach_entries;
drop policy if exists seo_outreach_entries_update_admin on public.seo_outreach_entries;
drop policy if exists seo_outreach_entries_delete_admin on public.seo_outreach_entries;

create policy seo_outreach_entries_select_authed
  on public.seo_outreach_entries for select to authenticated
  using (auth.uid() is not null);

create policy seo_outreach_entries_insert_authed
  on public.seo_outreach_entries for insert to authenticated
  with check (auth.uid() is not null);

create policy seo_outreach_entries_update_authed
  on public.seo_outreach_entries for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy seo_outreach_entries_delete_authed
  on public.seo_outreach_entries for delete to authenticated
  using (auth.uid() is not null);
