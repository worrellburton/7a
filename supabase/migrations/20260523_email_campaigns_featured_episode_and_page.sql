-- Two new featured-content slots for the email-campaign builder.
--   featured_episode_slug · pick any Recovery Roadmap episode
--   (static EPISODES + published AI blogs merged).
--   featured_page_path    · pick any inner marketing page
--   (admissions, our-program/equine-assisted, what-we-treat/*, etc.)
-- featured_blog_id stays in place for legacy compatibility; the UI
-- treats blog id + episode slug as mutually exclusive.

alter table public.email_campaigns
  add column if not exists featured_episode_slug text,
  add column if not exists featured_page_path text;

comment on column public.email_campaigns.featured_episode_slug is
  'Slug of a Recovery Roadmap episode (static or AI-published) when the campaign features a roadmap post that does not have a row in public.blogs. Mutually exclusive with featured_blog_id at the UI level.';
comment on column public.email_campaigns.featured_page_path is
  'Site-relative path (e.g. /admissions, /our-program/equine-assisted) of an inner marketing page the campaign features as a destination.';
