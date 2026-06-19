-- Shared store for Social Media post drafts. Replaces the per-browser
-- localStorage key (social_media_saved_drafts_v1) so drafts sync across
-- devices + teammates and can carry a "created by" attribution.
create table if not exists public.social_media_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- auth.uid() of the creator. NO foreign key: some operators are
  -- auth-only accounts without a public.users row, and an FK here would
  -- reject their inserts (the exact bug that snapped SEO statuses back).
  created_by uuid,
  created_by_name text,
  caption text not null default '',
  media_urls jsonb not null default '[]'::jsonb,
  platforms jsonb not null default '[]'::jsonb,
  ready boolean not null default false,
  media_by_deliverable jsonb not null default '[]'::jsonb
);

alter table public.social_media_drafts enable row level security;

-- The Social Media surface is already super-admin gated at the route +
-- page level; keep table RLS simple (any authenticated user) like
-- directory_states, and avoid a users-table dependency that auth-only
-- operators would trip.
drop policy if exists social_media_drafts_all_authenticated on public.social_media_drafts;
create policy social_media_drafts_all_authenticated
  on public.social_media_drafts for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- updated_at bookkeeping
create or replace function public.touch_social_media_drafts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_social_media_drafts_updated_at on public.social_media_drafts;
create trigger trg_social_media_drafts_updated_at
  before update on public.social_media_drafts
  for each row execute function public.touch_social_media_drafts_updated_at();

-- Live sync across open tabs / teammates
alter publication supabase_realtime add table public.social_media_drafts;
