-- Daily snapshots of Anthropic's /v1/models endpoint compared to the
-- model IDs the codebase is currently configured to use. Written by
-- the /api/cron/anthropic/model-check cron; read by /api/integrations
-- so /app/admin/apis can surface "newer model available" drift on the
-- existing Anthropic row.
create table if not exists public.anthropic_model_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  available_models jsonb not null default '[]'::jsonb,
  current_models jsonb not null default '{}'::jsonb,
  drift_detected boolean not null default false,
  drift_summary jsonb not null default '{}'::jsonb,
  http_status int,
  error text
);

create index if not exists anthropic_model_checks_checked_idx
  on public.anthropic_model_checks (checked_at desc);

alter table public.anthropic_model_checks enable row level security;

drop policy if exists anthropic_model_checks_select_authed on public.anthropic_model_checks;
create policy anthropic_model_checks_select_authed
  on public.anthropic_model_checks for select to authenticated
  using (auth.uid() is not null);
