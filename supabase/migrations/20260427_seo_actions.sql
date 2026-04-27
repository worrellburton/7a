-- SEO action items submitted by the team. Free-form admin todo list
-- specific to SEO work — separate from the curated Directories list
-- and from on-site Site Audit findings. Anyone with admin access can
-- submit, edit, complete, or delete entries; non-admins are blocked
-- by RLS so a future broader-permissions pass doesn't accidentally
-- expose the surface.
create table if not exists public.seo_actions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  description text,
  category text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','done','wontfix')),
  submitted_by uuid references public.users(id) on delete set null,
  submitted_by_name text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_actions_status_priority_created_idx
  on public.seo_actions (status, priority desc, created_at desc);
create index if not exists seo_actions_created_idx
  on public.seo_actions (created_at desc);

alter table public.seo_actions enable row level security;

drop policy if exists "seo_actions admin select" on public.seo_actions;
create policy "seo_actions admin select"
  on public.seo_actions
  for select
  using (is_admin());

drop policy if exists "seo_actions admin insert" on public.seo_actions;
create policy "seo_actions admin insert"
  on public.seo_actions
  for insert
  with check (is_admin());

drop policy if exists "seo_actions admin update" on public.seo_actions;
create policy "seo_actions admin update"
  on public.seo_actions
  for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "seo_actions admin delete" on public.seo_actions;
create policy "seo_actions admin delete"
  on public.seo_actions
  for delete
  using (is_admin());

create or replace function public.seo_actions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if (new.status in ('done','wontfix') and old.status not in ('done','wontfix')) then
    new.completed_at := now();
  elsif (new.status not in ('done','wontfix')) then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists seo_actions_touch_updated_at_trg on public.seo_actions;
create trigger seo_actions_touch_updated_at_trg
  before update on public.seo_actions
  for each row
  execute function public.seo_actions_touch_updated_at();
