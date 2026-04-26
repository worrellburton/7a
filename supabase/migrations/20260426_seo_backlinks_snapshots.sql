-- Persistent snapshot of the most recent Semrush pull per target.
-- The Backlinks page used to refetch on every load + every filter
-- click, which meant (a) Semrush API units burned on every visit and
-- (b) filter chips silently rendered blank when the small page of
-- rows happened to contain none of that bucket. The new model: one
-- "Sync" button writes a fresh snapshot here, every reader pulls
-- from the table.
create table if not exists public.seo_backlinks_snapshots (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  synced_by uuid references public.users(id) on delete set null
);

create index if not exists seo_backlinks_snapshots_target_synced_idx
  on public.seo_backlinks_snapshots (target, synced_at desc);

alter table public.seo_backlinks_snapshots enable row level security;

drop policy if exists "seo_backlinks_snapshots admin select" on public.seo_backlinks_snapshots;
create policy "seo_backlinks_snapshots admin select"
  on public.seo_backlinks_snapshots
  for select
  using (
    exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
    )
  );

drop policy if exists "seo_backlinks_snapshots admin insert" on public.seo_backlinks_snapshots;
create policy "seo_backlinks_snapshots admin insert"
  on public.seo_backlinks_snapshots
  for insert
  with check (
    exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
    )
  );
