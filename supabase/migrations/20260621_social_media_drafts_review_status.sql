-- Approval workflow: drafts move draft → in_review → approved.
-- `ready` stays the source of truth for "is it in the publishable bucket"
-- (approved == ready), so all existing ready-based logic is unchanged;
-- review_status just adds the review layer on top of not-ready drafts.
alter table public.social_media_drafts
  add column if not exists review_status text not null default 'draft';

-- Backfill: anything already marked ready is, by definition, approved.
update public.social_media_drafts
  set review_status = 'approved'
  where ready = true and review_status <> 'approved';

alter table public.social_media_drafts
  drop constraint if exists social_media_drafts_review_status_chk;
alter table public.social_media_drafts
  add constraint social_media_drafts_review_status_chk
  check (review_status in ('draft', 'in_review', 'approved'));
