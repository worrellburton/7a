-- Editorial roadmap for the /app/content blog pipeline. A row is a
-- "blog concept": working title + target keyword + intent + the
-- date the team wants it out. Click Build on the row and the
-- existing /api/content POST path creates a real blogs row with
-- the working title prepopulated; blog_id is then linked back here
-- so the roadmap can show "queued" → "building" → "published"
-- state without losing the planning context.

create table if not exists public.blog_roadmap_items (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  working_title text not null,
  target_keyword text,
  est_volume integer,
  intent text,
  target_date date,
  blog_id uuid references public.blogs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);

-- updated_at autobump using the project-wide trigger function.
drop trigger if exists blog_roadmap_items_set_updated_at on public.blog_roadmap_items;
create trigger blog_roadmap_items_set_updated_at
  before update on public.blog_roadmap_items
  for each row execute function public.set_updated_at();

create index if not exists blog_roadmap_items_position_idx on public.blog_roadmap_items (position);
create index if not exists blog_roadmap_items_target_date_idx on public.blog_roadmap_items (target_date);
create index if not exists blog_roadmap_items_blog_id_idx on public.blog_roadmap_items (blog_id);

-- Match the blogs table's gate: super-admin OR per-user override.
-- Every /api/content/roadmap/* route enforces requireSuperAdmin
-- server-side, so we mirror blogs' RLS shape here for defense
-- in depth. Service-role bypasses all of this.
alter table public.blog_roadmap_items enable row level security;

drop policy if exists blog_roadmap_items_select_authenticated on public.blog_roadmap_items;
create policy blog_roadmap_items_select_authenticated
  on public.blog_roadmap_items for select to authenticated
  using (auth.uid() is not null);

-- No permissive write policies — all writes go through the
-- server-side API routes (service role bypasses RLS).
