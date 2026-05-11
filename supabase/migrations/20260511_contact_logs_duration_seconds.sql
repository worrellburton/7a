-- public.contact_logs.duration_seconds — how long the call / meeting
-- lasted, captured when the admin logs an outreach action. The Log a
-- Contact modal requires the duration on every save: typed entry for
-- Phone / In Person, auto-defaults to 30 (a typical brief voicemail)
-- when the method is "Left Message".
--
-- Nullable so older rows imported before this column existed don't
-- need a backfill — they just render the duration as "—" in the
-- history timeline.

alter table public.contact_logs
  add column if not exists duration_seconds integer;
