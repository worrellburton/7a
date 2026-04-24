-- GEO audits — persisted runs of /api/geo/audit/run.
--
-- Each row is one full orchestrator pass: site, overall score, grade,
-- which engines ran vs which were skipped (missing API keys), full
-- AuditResponse payload in JSONB (so we don't schema-change every
-- time a new field lands), duration, who ran it, when.
--
-- Reads + writes are admin-only (service-role bypasses RLS in the API
-- route). Audits are append-only — never updated, never deleted from
-- the app — so trend queries over time always have a full history.
--
-- Applied via mcp__supabase__apply_migration on 2026-04-24.

create table if not exists public.geo_audits (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  score int not null check (score between 0 and 100),
  grade text not null,
  engines text[] not null default '{}'::text[],
  skipped_engines text[] not null default '{}'::text[],
  -- Full AuditResponse payload (score, results, prompt, etc.) as JSONB
  -- so we don't schema-change every time a new field is added.
  payload jsonb not null,
  duration_ms int not null default 0,
  ran_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists geo_audits_site_created_idx
  on public.geo_audits (site, created_at desc);
create index if not exists geo_audits_created_idx
  on public.geo_audits (created_at desc);

alter table public.geo_audits enable row level security;

-- Admin-only reads. Writes go through the service-role, which bypasses RLS.
drop policy if exists "admin read geo_audits" on public.geo_audits;
create policy "admin read geo_audits"
  on public.geo_audits
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_admin = true
    )
  );
