-- Per-episode overrides for the hand-coded blog posts whose body
-- lives in /src/app/(site)/.../content.tsx. Keyed by EPISODES.slug
-- so the dashboard at /app/content/static/<slug> can edit byline +
-- last-reviewed timestamp + schema_json the same way the
-- AI-pipeline dashboard does, without touching the .tsx file.
--
-- All fields are nullable — the resolver falls back to the seeded
-- BLOG_AUTHORS default + the post's static publishedAt when an
-- override isn't set.

create table if not exists public.static_blog_meta (
  slug text primary key,
  author_slug text,
  reviewer_slug text,
  last_reviewed_at timestamptz,
  schema_json jsonb,
  schema_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.static_blog_meta enable row level security;

drop policy if exists static_blog_meta_select_authed on public.static_blog_meta;
create policy static_blog_meta_select_authed
  on public.static_blog_meta for select to authenticated
  using (auth.uid() is not null);

drop policy if exists static_blog_meta_write_authed on public.static_blog_meta;
create policy static_blog_meta_write_authed
  on public.static_blog_meta for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
