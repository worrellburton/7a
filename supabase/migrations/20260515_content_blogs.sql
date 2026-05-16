-- AI-driven content pipeline for /app/content. A blog row carries
-- the prompt the admin typed, the latest body markdown, the chosen
-- layout, and the lifecycle status. Revisions and images live in
-- their own tables so the blog row stays small and so Claude can
-- iterate without truncating history.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blog_status') then
    create type blog_status as enum (
      'draft',
      'reviewing',
      'images',
      'selecting',
      'built',
      'published'
    );
  end if;
end$$;

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  status blog_status not null default 'draft',
  prompt text,
  body_markdown text,
  layout jsonb,
  selected_image_ids uuid[],
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.blog_revisions (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs(id) on delete cascade,
  user_prompt text,
  body_markdown text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_images (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs(id) on delete cascade,
  provider text not null,
  url text not null,
  prompt text,
  alt text,
  position int,
  created_at timestamptz not null default now()
);

create index if not exists idx_blogs_status on public.blogs(status);
create index if not exists idx_blog_revisions_blog_id on public.blog_revisions(blog_id, created_at desc);
create index if not exists idx_blog_images_blog_id on public.blog_images(blog_id, position);

alter table public.blogs enable row level security;
alter table public.blog_revisions enable row level security;
alter table public.blog_images enable row level security;

drop policy if exists "blogs read for admins" on public.blogs;
create policy "blogs read for admins"
  on public.blogs for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (u.is_admin = true or u.is_super_admin = true)
    )
  );

drop policy if exists "blogs write for super admins" on public.blogs;
create policy "blogs write for super admins"
  on public.blogs for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

drop policy if exists "blog_revisions read for admins" on public.blog_revisions;
create policy "blog_revisions read for admins"
  on public.blog_revisions for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (u.is_admin = true or u.is_super_admin = true)
    )
  );

drop policy if exists "blog_revisions write for super admins" on public.blog_revisions;
create policy "blog_revisions write for super admins"
  on public.blog_revisions for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

drop policy if exists "blog_images read for admins" on public.blog_images;
create policy "blog_images read for admins"
  on public.blog_images for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (u.is_admin = true or u.is_super_admin = true)
    )
  );

drop policy if exists "blog_images write for super admins" on public.blog_images;
create policy "blog_images write for super admins"
  on public.blog_images for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );

create or replace function public.blogs_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_blogs_touch_updated_at on public.blogs;
create trigger trg_blogs_touch_updated_at
  before update on public.blogs
  for each row execute function public.blogs_touch_updated_at();

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "blog-images read public" on storage.objects;
create policy "blog-images read public"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "blog-images write super admin" on storage.objects;
create policy "blog-images write super admin"
  on storage.objects for insert
  with check (
    bucket_id = 'blog-images'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_super_admin = true
    )
  );
