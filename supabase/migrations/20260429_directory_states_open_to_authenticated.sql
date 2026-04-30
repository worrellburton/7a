-- Open directory_states to any signed-in user. The page itself isn't
-- admin-only, so SEO teammates without is_admin=true were getting
-- read denied (RLS) which manifested as "I changed the status but
-- nothing happened" — the optimistic UI updated, the upsert was
-- rejected, no realtime event fired.
--
-- Same reasoning for the chat thread table: any signed-in user that
-- can see the page should be able to comment.

drop policy if exists directory_states_select_admin on public.directory_states;
drop policy if exists directory_states_write_admin on public.directory_states;

create policy directory_states_select_authenticated
  on public.directory_states
  for select
  using (auth.uid() is not null);

create policy directory_states_write_authenticated
  on public.directory_states
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Comments thread: same broadening so non-admin SEO contributors can
-- read + post + delete their own.
drop policy if exists seo_directory_messages_select_admin on public.seo_directory_messages;
drop policy if exists seo_directory_messages_insert_admin on public.seo_directory_messages;
drop policy if exists seo_directory_messages_delete_own on public.seo_directory_messages;

create policy seo_directory_messages_select_authenticated
  on public.seo_directory_messages
  for select
  using (auth.uid() is not null);

create policy seo_directory_messages_insert_authenticated
  on public.seo_directory_messages
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy seo_directory_messages_delete_own
  on public.seo_directory_messages
  for delete
  using (user_id = auth.uid());

-- Custom directories rows are also part of this surface; broaden so
-- non-admin contributors can add a directory + see them.
do $$
begin
  if exists (select 1 from pg_class where relname = 'seo_custom_directories') then
    execute 'drop policy if exists seo_custom_directories_select_admin on public.seo_custom_directories';
    execute 'drop policy if exists seo_custom_directories_write_admin on public.seo_custom_directories';

    if not exists (
      select 1 from pg_policy p
      join pg_class c on c.oid = p.polrelid
      where c.relname = 'seo_custom_directories' and p.polname = 'seo_custom_directories_select_authenticated'
    ) then
      execute $cmd$create policy seo_custom_directories_select_authenticated on public.seo_custom_directories for select using (auth.uid() is not null)$cmd$;
    end if;
    if not exists (
      select 1 from pg_policy p
      join pg_class c on c.oid = p.polrelid
      where c.relname = 'seo_custom_directories' and p.polname = 'seo_custom_directories_write_authenticated'
    ) then
      execute $cmd$create policy seo_custom_directories_write_authenticated on public.seo_custom_directories for all using (auth.uid() is not null) with check (auth.uid() is not null)$cmd$;
    end if;
  end if;
end $$;
