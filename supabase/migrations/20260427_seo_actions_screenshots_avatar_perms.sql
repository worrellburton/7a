-- Phase 2 of the SEO Actions surface:
--   * Drop the 200-char title check — the form now uses one
--     textarea instead of separate title + description fields, so a
--     single message can run a paragraph or two.
--   * Track per-action screenshot URLs (Supabase storage paths).
--   * Snapshot the submitter's avatar at submit time so deleting a
--     user doesn't strip historical context off their actions.
--   * Replace the admin-only UPDATE/DELETE policies with
--     super-admin OR owner so a regular admin can manage their own
--     submissions but only super-admins can delete other people's.
alter table public.seo_actions drop constraint if exists seo_actions_title_check;
alter table public.seo_actions
  add constraint seo_actions_title_check check (length(title) between 1 and 4000);

alter table public.seo_actions
  add column if not exists screenshot_urls text[] not null default '{}',
  add column if not exists submitted_by_avatar_url text;

drop policy if exists "seo_actions admin update" on public.seo_actions;
create policy "seo_actions update super-admin or owner"
  on public.seo_actions
  for update
  using (is_super_admin() or submitted_by = auth.uid())
  with check (is_super_admin() or submitted_by = auth.uid());

drop policy if exists "seo_actions admin delete" on public.seo_actions;
create policy "seo_actions delete super-admin or owner"
  on public.seo_actions
  for delete
  using (is_super_admin() or submitted_by = auth.uid());
