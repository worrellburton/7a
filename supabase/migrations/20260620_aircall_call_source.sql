-- Per-call "how did you hear about us?" source, extracted from the
-- transcript by Claude (blank/none when the operator never asked).
alter table public.aircall_calls
  add column if not exists source text;

-- Admin override of the source, keyed per caller number on the existing
-- number-labels table. When an admin edits the source for one call it is
-- written here and overlays every call from that number.
alter table public.aircall_number_labels
  add column if not exists source text;
