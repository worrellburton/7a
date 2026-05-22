-- /app/seo and its sub-tabs (Directories, Press releases, Guest
-- posts, Brand profiles, Comment, Forum) are part of the Marketing
-- & Admissions department surface — the page_permissions row has
-- department_id pointing to the marketing dept and admin_only =
-- false. But the seo_outreach_entries RLS policies were
-- accidentally admin-only, so Marketing dept members could see
-- the page but couldn't add a brand profile / press release / etc.
-- (the Add button would 'succeed' on the client and silently 403
-- on the server). Opening write access to Marketing dept members
-- in addition to admins.
--
-- Marketing dept = users.department_id =
-- 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' (same constant the
-- /api/website-requests helpers use).

drop policy if exists seo_outreach_entries_select_admin on public.seo_outreach_entries;
create policy seo_outreach_entries_select_admin on public.seo_outreach_entries
  for select using (
    is_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

drop policy if exists seo_outreach_entries_insert_admin on public.seo_outreach_entries;
create policy seo_outreach_entries_insert_admin on public.seo_outreach_entries
  for insert with check (
    is_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

drop policy if exists seo_outreach_entries_update_admin on public.seo_outreach_entries;
create policy seo_outreach_entries_update_admin on public.seo_outreach_entries
  for update
  using (
    is_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

drop policy if exists seo_outreach_entries_delete_admin on public.seo_outreach_entries;
create policy seo_outreach_entries_delete_admin on public.seo_outreach_entries
  for delete using (
    is_admin()
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );
