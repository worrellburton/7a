-- Add vob_requests to the supabase_realtime publication so the
-- ContactSubmissionToasts component can pop a live toast when a new
-- VOB lands. Without this, the only signal a coordinator gets is
-- the sidebar badge updating on the next 60s poll — too slow for
-- the admissions team.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vob_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.vob_requests';
  end if;
end $$;

-- REPLICA IDENTITY FULL so UPDATE events carry the previous row
-- payload too; matters when a teammate marks a VOB responded /
-- spam upstream and we want to clear the toast on every other
-- session.
alter table public.vob_requests replica identity full;
