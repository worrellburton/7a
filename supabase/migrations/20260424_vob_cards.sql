-- VOB submissions: persist insurance card photos.
--
-- The public AdmissionsForm previously dropped the front/back card
-- photos client-side ("phase 2 will add the storage bucket + signed
-- upload flow"). This migration finishes phase 2:
--
--   1. A `vob-cards` storage bucket (private) — service role reads,
--      anon inserts, no public listing.
--   2. Two new text columns on vob_requests holding the storage path
--      of each uploaded card (e.g. `<token>/front-<ts>.jpg`).
--
-- The admin list API turns those paths into short-lived signed URLs
-- so the VOBs page can render thumbnails without exposing the bucket
-- to the open web.

-- ----- Columns on vob_requests -----
alter table public.vob_requests
  add column if not exists card_front_path text,
  add column if not exists card_back_path text;

-- ----- Storage bucket -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vob-cards',
  'vob-cards',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- ----- Storage policies -----
-- Anon can INSERT into the bucket (public form uploads). They cannot
-- list, read, update, or delete — paths include a random token and
-- the admin list route generates signed URLs server-side.
drop policy if exists "anon insert vob-cards" on storage.objects;
create policy "anon insert vob-cards"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'vob-cards');

-- Authenticated users do NOT get blanket read access. Reads happen
-- server-side via the service-role key (which bypasses RLS).
