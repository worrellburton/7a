-- ElevenLabs TTS output URL for each /app/content blog. Populated by
-- the /api/content/[id]/audio route; the public renderer reads this
-- column to decide whether to mount the audio player above the post.
alter table public.blogs
  add column if not exists audio_url text;
