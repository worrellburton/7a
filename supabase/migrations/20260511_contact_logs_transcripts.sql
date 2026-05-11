-- Transcript paste + Claude-generated summary for the Log-a-Contact
-- flow on /app/outreach.
--
-- transcript_storage_path  — path within the private contact-transcripts
--                            bucket (we store the raw call/meeting
--                            transcript as plain text there so we
--                            never blow up the row size and so the
--                            history grid stays cheap to render).
-- transcript_summary       — Claude-generated short summary, shown
--                            inline in the per-log entry on the
--                            inline contact details drawer.
--
-- Both columns are nullable — most logs won't have a transcript;
-- this is opt-in when an admin pastes one into the modal.

alter table public.contact_logs
  add column if not exists transcript_storage_path text,
  add column if not exists transcript_summary text;

-- Private storage bucket. text/plain only, 5MB cap (a long Otter
-- transcript runs well under 100KB; 5MB is plenty of headroom and
-- still keeps the table small). Reads + writes go through API
-- routes that use the service-role key, so the browser never needs
-- a Storage token and we don't need per-user RLS on this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contact-transcripts', 'contact-transcripts', false, 5242880, array['text/plain'])
on conflict (id) do nothing;
