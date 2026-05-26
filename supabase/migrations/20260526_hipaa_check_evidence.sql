-- Per-check evidence + verification overrides for /app/hipaa.
-- See route /api/hipaa/evidence + the scanner's apply-overrides
-- step for how this is consumed.

create table if not exists public.hipaa_check_evidence (
  check_id text primary key,
  status_override text check (status_override in ('pass', 'fail')),
  note text,
  evidence_url text,
  expires_at timestamptz,
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hipaa_check_evidence enable row level security;

drop policy if exists hipaa_evidence_super_admin_all on public.hipaa_check_evidence;
create policy hipaa_evidence_super_admin_all on public.hipaa_check_evidence
  for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_super_admin = true)
  )
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_super_admin = true)
  );
