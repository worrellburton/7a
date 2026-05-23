-- Kaizen — daily Claude-generated codebase scan that produces a
-- short list of improvement recommendations across two areas
-- (Website + Feather) and five categories (Features, Codebase,
-- Growth, UX, Performance). Each recommendation carries a
-- ready-to-paste copy_prompt the super admin pastes into Claude
-- Code to implement the change. Restricted to super_admin / admin
-- read access via RLS; the page itself is super-admin-gated.

create table if not exists public.kaizen_scans (
  id uuid primary key default gen_random_uuid(),
  scanned_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  model text,
  error_message text,
  triggered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists kaizen_scans_scanned_at_idx
  on public.kaizen_scans (scanned_at desc);

create table if not exists public.kaizen_recommendations (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.kaizen_scans(id) on delete cascade,
  area text not null check (area in ('website','feather')),
  category text not null check (category in ('features','codebase','growth','ux','performance')),
  seo_geo text not null default 'none' check (seo_geo in ('none','seo','geo','both')),
  title text not null,
  description text not null,
  copy_prompt text not null,
  priority integer not null default 3 check (priority between 1 and 5),
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kaizen_recommendations_scan_id_idx
  on public.kaizen_recommendations (scan_id);

alter table public.kaizen_scans enable row level security;
alter table public.kaizen_recommendations enable row level security;

drop policy if exists "kaizen_scans super_admins read" on public.kaizen_scans;
create policy "kaizen_scans super_admins read"
  on public.kaizen_scans for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and (u.is_super_admin = true or u.is_admin = true)
    )
  );

drop policy if exists "kaizen_recommendations super_admins read" on public.kaizen_recommendations;
create policy "kaizen_recommendations super_admins read"
  on public.kaizen_recommendations for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and (u.is_super_admin = true or u.is_admin = true)
    )
  );

comment on table public.kaizen_scans is
  'Daily Claude-generated scan of the codebase. Each scan produces ~10 recommendations across Website + Feather.';
comment on table public.kaizen_recommendations is
  'Individual improvement recommendation produced by a kaizen_scan. Each row has a ready-to-paste copy_prompt the super admin can drop into Claude Code to implement the change.';
