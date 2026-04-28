-- Open seo_actions select + insert to any signed-in user. Update +
-- delete stay scoped to the row's submitter (or a super-admin) so
-- nobody can edit somebody else's action. The INSERT with-check
-- pins submitted_by to auth.uid() so a user can't pretend to file
-- on someone else's behalf.

drop policy if exists "seo_actions admin select" on public.seo_actions;
create policy "seo_actions authenticated select"
  on public.seo_actions
  for select
  to authenticated
  using (true);

drop policy if exists "seo_actions admin insert" on public.seo_actions;
create policy "seo_actions authenticated insert"
  on public.seo_actions
  for insert
  to authenticated
  with check (submitted_by = auth.uid());
