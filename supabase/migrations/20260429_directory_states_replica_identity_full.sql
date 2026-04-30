-- Force REPLICA IDENTITY FULL on directory_states so Supabase
-- Realtime delivers the entire row in payload.new (for INSERTs and
-- UPDATEs) and payload.old (for DELETEs). With the default identity,
-- DELETE events only carry the primary key and some UPDATE payloads
-- can omit unchanged columns — both have surfaced as "I changed the
-- status but my coworker doesn't see it" reports on the SEO
-- directories table.
alter table public.directory_states replica identity full;
-- Same fix on the comment thread table so chat deletes carry full
-- payloads (already in supabase_realtime publication).
alter table public.seo_directory_messages replica identity full;
