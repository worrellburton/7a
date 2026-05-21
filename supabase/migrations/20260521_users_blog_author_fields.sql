-- Blog author / medical reviewer flags + LinkedIn URL on users so
-- HR can promote a teammate into the byline dropdowns without
-- editing /lib/blogAuthors.ts. The author registry stays as a
-- fallback seed (Lindsay Rothschild) for environments where the
-- DB isn't reachable at render time, but the dropdown + the
-- per-post resolver both prefer the DB row when present.

alter table public.users
  add column if not exists linkedin_url text,
  add column if not exists is_blog_author boolean not null default false,
  add column if not exists is_medical_reviewer boolean not null default false;

-- Seed the existing hard-coded author so the editor reads the
-- same person off the DB. Matches the BLOG_AUTHORS slug used
-- across BLOG_AUTHORS / DEFAULT_AUTHOR_SLUG / DEFAULT_REVIEWER_SLUG.
update public.users
   set is_blog_author      = true,
       is_medical_reviewer = true,
       credentials = coalesce(credentials, 'LCSW'),
       bio = coalesce(bio,
         'Clinical Director at Seven Arrows Recovery. Lindsay leads the clinical team in Elfrida, Arizona, and writes about trauma-informed addiction treatment.')
 where public_slug = 'lindsay-rothschild';

-- Index for the dropdown fetch path; partial index keeps it tiny
-- since only a handful of users will ever carry these flags.
create index if not exists users_blog_author_idx
  on public.users (public_slug)
  where is_blog_author = true;
create index if not exists users_medical_reviewer_idx
  on public.users (public_slug)
  where is_medical_reviewer = true;
