-- 301/302 redirect registry for the admin SEO console.
--
-- The old WordPress site had a large URL footprint that SEO and
-- inbound links still depend on. This table lets admins edit the
-- old-path -> new-path mappings at runtime; the Next.js middleware
-- reads the enabled rows and issues a matching redirect at the edge.
--
-- Design notes:
--   * from_path is the *path portion only* (leading slash, no host,
--     no query string). Trailing slashes are not normalised here so
--     the middleware can match both `/foo/` and `/foo` with a simple
--     two-key lookup.
--   * to_path may be a relative path ('/new-path') or an absolute
--     URL ('https://...'). Same-host 301s should be relative.
--   * status_code is 301 (default, permanent) or 302 (temporary).
--     For permanent site migrations 301 is what Google wants.
--   * hits / last_hit_at are bumped by the middleware via a fire-
--     and-forget RPC so admins can spot dead rules and popular
--     inbound paths.

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code smallint not null default 301 check (status_code in (301, 302, 307, 308)),
  enabled boolean not null default true,
  notes text,
  hits bigint not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists redirects_from_path_idx on public.redirects (from_path);
create index if not exists redirects_enabled_idx on public.redirects (enabled);

create or replace function public.redirects_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists redirects_updated_at on public.redirects;
create trigger redirects_updated_at
  before update on public.redirects
  for each row execute function public.redirects_set_updated_at();

-- RLS: reads via service-role only (admin console + middleware). No
-- anon/authenticated policy needed; redirects aren't user-facing
-- data beyond what the middleware projects.
alter table public.redirects enable row level security;

-- Hit bump RPC. SECURITY DEFINER so the middleware (using the
-- anon/service key) can increment without full update rights on the
-- base table. Takes the unique from_path, no-ops if missing.
create or replace function public.redirects_bump_hit(p_from_path text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.redirects
     set hits = hits + 1,
         last_hit_at = now()
   where from_path = p_from_path;
$$;
revoke all on function public.redirects_bump_hit(text) from public;
grant execute on function public.redirects_bump_hit(text) to anon, authenticated, service_role;
