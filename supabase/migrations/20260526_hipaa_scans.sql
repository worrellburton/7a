-- Audit trail of every HIPAA technical-safeguards scan run from
-- /app/hipaa. Compliance auditors expect a paper trail; persisting
-- each scan + its findings keeps that history queryable.
--
-- NOT a legal compliance record — see the page itself for the
-- 'technical safeguards only' caveats. This table stores what the
-- automated checker FOUND, nothing more.

create table if not exists public.hipaa_scans (
  id uuid primary key default gen_random_uuid(),
  ran_by uuid references public.users(id) on delete set null,
  ran_at timestamptz not null default now(),
  -- Aggregate score 0..100 of the technical checks (BAAs excluded).
  tech_score integer not null,
  -- Number of pass / fail / manual checks at scan time.
  pass_count integer not null default 0,
  fail_count integer not null default 0,
  manual_count integer not null default 0,
  -- Full check payload (array of HipaaCheck objects). Stored as
  -- jsonb so future check additions don't break existing rows.
  payload jsonb not null
);

create index if not exists hipaa_scans_ran_at_idx
  on public.hipaa_scans (ran_at desc);

alter table public.hipaa_scans enable row level security;

drop policy if exists hipaa_scans_super_admin_read on public.hipaa_scans;
create policy hipaa_scans_super_admin_read on public.hipaa_scans
  for select to authenticated using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_super_admin = true)
  );
