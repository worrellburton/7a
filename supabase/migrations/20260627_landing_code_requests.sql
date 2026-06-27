-- History for the Feather Landing → Code editor. One row per PR opened
-- through the tab, so the panel can show what changed, who requested it,
-- and offer a one-click revert. `changes` stores the applied
-- old_string/new_string edits per file so a revert can reverse them
-- without needing git-revert semantics. Written only by the service-role
-- server route; RLS is on with no policies so client roles can't read it.
create table if not exists public.landing_code_requests (
  id uuid primary key default gen_random_uuid(),
  pr_number integer not null,
  pr_url text not null,
  title text not null,
  summary text,
  instruction text not null,
  changed_files text[] not null default '{}',
  changes jsonb not null default '[]'::jsonb,
  branch text not null,
  requested_by uuid,
  requested_by_email text,
  requested_by_name text,
  reverts_pr_number integer,
  created_at timestamptz not null default now()
);
alter table public.landing_code_requests enable row level security;
create index if not exists landing_code_requests_created_idx
  on public.landing_code_requests (created_at desc);
