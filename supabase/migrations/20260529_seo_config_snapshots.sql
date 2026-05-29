-- Daily snapshots of the deployed next.config.mjs, captured by the
-- 6 AM cron (/api/cron/seo/next-config-snapshot). The public download
-- route (/api/seo/next-config) serves the latest snapshot so anyone
-- can download the current build config; the internal SEO page lists
-- recent snapshots. Content is non-sensitive (the file only references
-- env-var NAMES, never their values).
create table if not exists public.seo_config_snapshots (
  id uuid primary key default gen_random_uuid(),
  filename text not null default 'next.config.mjs',
  content text not null,
  byte_size int not null default 0,
  captured_at timestamptz not null default now()
);

create index if not exists seo_config_snapshots_captured_idx
  on public.seo_config_snapshots (captured_at desc);

alter table public.seo_config_snapshots enable row level security;

-- Authenticated app users (the SEO page is admin-gated in the UI) can
-- read the snapshot list. Writes happen only via the service-role
-- client in the cron route, which bypasses RLS.
drop policy if exists seo_config_snapshots_select_authed on public.seo_config_snapshots;
create policy seo_config_snapshots_select_authed
  on public.seo_config_snapshots for select to authenticated
  using (auth.uid() is not null);
