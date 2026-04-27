-- SEO audits — persisted runs of /api/seo/audit/run.
--
-- Each row is one full audit pass: origin, score, grade, full result
-- payload (JSONB so we can read everything the runner returned without
-- a schema change every time we add a field), and timing.
--
-- Reads are admin-only via the RLS policy below; writes go through the
-- service-role client in /api/seo/audit/run, which bypasses RLS.
-- Audits are append-only — never updated, never deleted from the app —
-- so "what was the score 3 months ago" is always answerable.
--
-- /api/seo/audit/latest reads the most recent row, so every admin sees
-- the same shared run instead of their own browser's localStorage.

create table if not exists public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  score int not null check (score between 0 and 100),
  grade text not null,
  -- Whole AuditResult JSON (sitemap, categories, insights, prompt,
  -- crawl summary). Stored as jsonb so individual fields are queryable
  -- without rehydration.
  payload jsonb not null,
  duration_ms int not null default 0,
  ran_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists seo_audits_origin_created_idx
  on public.seo_audits (origin, created_at desc);
create index if not exists seo_audits_created_idx
  on public.seo_audits (created_at desc);

alter table public.seo_audits enable row level security;

-- Admin-only reads. (Writes go through the service-role from the API
-- route, which bypasses RLS entirely.)
drop policy if exists "admin read seo_audits" on public.seo_audits;
create policy "admin read seo_audits"
  on public.seo_audits
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_admin = true
    )
  );
