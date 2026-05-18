-- ElevenLabs TTS output for /app/content blogs is uploaded to a
-- dedicated `blog-audio` bucket so the URLs stay stable and the
-- public site can stream the MP3 without a signed-URL round-trip.
-- The route at /api/content/[id]/audio writes via the service-role
-- client, so write policy is admin-side; read is public so the audio
-- player on the public blog page can fetch without auth.
insert into storage.buckets (id, name, public)
values ('blog-audio', 'blog-audio', true)
on conflict (id) do update set public = excluded.public;
