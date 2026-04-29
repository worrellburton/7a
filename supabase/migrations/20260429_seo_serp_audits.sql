-- Run history for the SERP Audit page (/app/seo/serp-audit). Each
-- run captures a SerpAPI search of "domain" -site:domain — who else
-- on the web mentions the brand — so the team can monitor scraped
-- content, citation opportunities, and link-building leads.

create table if not exists public.seo_serp_audits (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  run_by uuid references auth.users(id) on delete set null,
  query text not null,
  result_count integer not null default 0,
  results jsonb not null default '[]'::jsonb,
  raw jsonb,
  error text
);

create index if not exists seo_serp_audits_run_at_idx on public.seo_serp_audits (run_at desc);

alter table public.seo_serp_audits enable row level security;

drop policy if exists seo_serp_audits_admin_select on public.seo_serp_audits;
create policy seo_serp_audits_admin_select on public.seo_serp_audits
  for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true));

alter publication supabase_realtime add table public.seo_serp_audits;
