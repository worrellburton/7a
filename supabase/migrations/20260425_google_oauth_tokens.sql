-- Singleton row holding the live Google OAuth refresh token used by
-- GA4, Search Console, and Business Profile reads. Lets a Workspace
-- admin click "Reconnect Google" inside the app and have the new
-- token take effect immediately, instead of re-running OAuth
-- Playground and pushing a Vercel env var.
--
-- The original env-var (GOOGLE_OAUTH_REFRESH_TOKEN) is still
-- consulted as a fallback when this table is empty, so an empty DB
-- doesn't break a working deployment.
create table if not exists public.google_oauth_tokens (
  id text primary key default 'primary',
  refresh_token text not null,
  scope text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  constraint google_oauth_tokens_singleton check (id = 'primary')
);

alter table public.google_oauth_tokens enable row level security;

-- Only admins (server-side service role) read/write. No anon or
-- authenticated-user policies — the refresh token is a server-only
-- secret. The /api/google/oauth/* routes use the admin client.

create or replace function public.touch_google_oauth_tokens()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_google_oauth_tokens_touch on public.google_oauth_tokens;
create trigger trg_google_oauth_tokens_touch
  before update on public.google_oauth_tokens
  for each row execute function public.touch_google_oauth_tokens();

comment on table public.google_oauth_tokens is
  'Singleton row (id=primary) storing the live Google OAuth refresh token. Read/written by service-role-only API routes — never exposed to anon or authenticated clients.';
