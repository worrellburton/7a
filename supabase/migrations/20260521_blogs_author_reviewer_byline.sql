-- Per-post author + medical-reviewer byline for AI-pipeline blogs.
--
-- Mirrors the static EPISODES catalogue's `authorSlug` /
-- `reviewerSlug` / `lastReviewedAt` fields so DB-backed posts can
-- emit the same schema.org/MedicalWebPage block at render time
-- (visible "Written by ... · Medically reviewed by ..." byline +
-- structured-data Person nodes for the author and reviewer).
--
-- All three columns are text/timestamp + nullable; the render
-- layer falls back to DEFAULT_AUTHOR_SLUG / DEFAULT_REVIEWER_SLUG
-- via resolveAuthor() / resolveReviewer(), so a null here doesn't
-- regress E-E-A-T signal on the public page.

alter table public.blogs
  add column if not exists author_slug text,
  add column if not exists reviewer_slug text,
  add column if not exists last_reviewed_at timestamptz;

-- Backfill: every existing row gets the default clinician slugs
-- and a last_reviewed_at stamp. UPDATEs are idempotent (only
-- touch rows that haven't been filled in yet) so re-running this
-- after the editor has set per-post slugs is safe.
update public.blogs
   set author_slug      = 'lindsay-rothschild'
 where author_slug is null;

update public.blogs
   set reviewer_slug    = 'lindsay-rothschild'
 where reviewer_slug is null;

update public.blogs
   set last_reviewed_at = coalesce(published_at, updated_at, now())
 where last_reviewed_at is null;
