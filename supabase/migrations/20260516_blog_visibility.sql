-- Per-slug visibility flag for both AI-pipeline and hand-coded blog
-- posts. A row marked hidden=true is filtered out of every public
-- listing (Recovery Roadmap index, BlogPreview, related-episode
-- carousels) but the page itself stays routable so inbound links
-- don't 404.
--
-- Keyed by slug (text) so it works uniformly across:
--   - hand-coded posts (slugs live in src/lib/episodes.ts)
--   - AI-pipeline posts (slugs live on public.blogs.slug)

create table if not exists public.blog_visibility (
  slug text primary key,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

create or replace function public.blog_visibility_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_blog_visibility_touch_updated_at on public.blog_visibility;
create trigger trg_blog_visibility_touch_updated_at
  before update on public.blog_visibility
  for each row execute function public.blog_visibility_touch_updated_at();

alter table public.blog_visibility enable row level security;

-- Anyone (anon + signed-in) can read so the public site can apply
-- the filter without leaking which posts exist.
drop policy if exists "blog_visibility read public" on public.blog_visibility;
create policy "blog_visibility read public"
  on public.blog_visibility for select
  using (true);

drop policy if exists "blog_visibility write super admin" on public.blog_visibility;
create policy "blog_visibility write super admin"
  on public.blog_visibility for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );
