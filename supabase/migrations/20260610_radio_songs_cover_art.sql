-- Radio cover art: store a per-track cover image URL. Covers are
-- auto-extracted from the MP3's embedded ID3 artwork at upload time
-- (client-side) and can be set/replaced manually by super admins, so
-- the `radio` bucket now accepts images alongside MP3s.
alter table public.radio_songs
  add column if not exists cover_url text;

update storage.buckets
set allowed_mime_types = array['audio/mpeg','audio/mp3','image/jpeg','image/png','image/webp']
where id = 'radio';
