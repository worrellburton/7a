-- Loosen the vob-cards storage policy so signed-in roles can upload
-- too. The original policy granted INSERT to the `anon` role only,
-- which meant any admin testing the AdmissionsForm while logged in
-- got their session role classified as `authenticated` — and the
-- policy's role filter rejected the insert silently. The form had no
-- error handling on the upload so the row landed with null card
-- paths and the bucket stayed empty.
--
-- Switching to `to public` keeps the same bucket guard but covers
-- both anon visitors and signed-in members.
drop policy if exists "anon insert vob-cards" on storage.objects;

create policy "public insert vob-cards"
  on storage.objects
  for insert
  to public
  with check (bucket_id = 'vob-cards');
