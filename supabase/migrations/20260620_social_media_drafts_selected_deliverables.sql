-- Which per-platform deliverables the operator has checked for a draft
-- (keys of the form "<platformId>|<spec label>"). Drives the per-slot
-- preview ("what's inputted") on the draft detail page. Empty array means
-- "not customised yet" — the UI then treats every deliverable as checked.
alter table public.social_media_drafts
  add column if not exists selected_deliverables jsonb not null default '[]'::jsonb;
