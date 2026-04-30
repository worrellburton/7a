-- Add seo_directory_messages to the supabase_realtime publication so
-- per-row chat threads receive live INSERT/DELETE events. Without
-- this, two admins on the same directory wouldn't see each other's
-- comments until a manual refresh — RowChat's subscribe call would
-- succeed but no payloads would ever land.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'seo_directory_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.seo_directory_messages';
  end if;
end $$;
