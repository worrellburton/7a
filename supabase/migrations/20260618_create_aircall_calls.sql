-- Aircall call log. Mirrors the CTM `calls` table pattern (a durable,
-- queryable mirror written by webhooks + a backfill) but models the
-- Aircall Call object: users / teams / numbers, recordings, voicemail,
-- tags / comments, and Conversation-Intelligence AI (transcript,
-- summary, key topics, sentiment). Marketing-source attribution does
-- not exist in Aircall, so those CTM columns are intentionally absent.

create table if not exists public.aircall_calls (
  id                  uuid primary key default gen_random_uuid(),
  aircall_id          bigint unique not null,          -- Call.id
  call_uuid           text,                            -- Call.call_uuid (webhook payloads)
  sid                 text,                            -- Call.sid
  direction           text,                            -- 'inbound' | 'outbound'
  status              text,                            -- 'initial' | 'answered' | 'done'
  missed              boolean not null default false,  -- derived: ended without answer
  missed_call_reason  text,
  voicemail           boolean not null default false,
  archived            boolean not null default false,

  started_at          timestamptz,
  answered_at         timestamptz,
  ended_at            timestamptz,
  duration            integer,                         -- seconds

  raw_digits          text,                            -- external party number (intl format)
  caller_number       text,                            -- digits-only external number for matching

  -- The Aircall line the call came in on / went out from.
  number_id           bigint,
  number_name         text,
  number_digits       text,

  -- The agent who handled the call (maps to a feather user by email).
  user_id             bigint,
  user_name           text,
  user_email          text,
  assigned_user_id    bigint,
  assigned_user_name  text,
  assigned_user_email text,

  -- The Aircall contact attached to the call, if any.
  contact_id          bigint,
  contact_name        text,
  contact_company     text,

  teams               text[]  not null default '{}',
  tags                text[]  not null default '{}',
  comments            jsonb   not null default '[]',

  -- Media
  recording_url       text,
  voicemail_url       text,
  asset_url           text,

  -- Conversation Intelligence (AI Assist add-on). Arrive post-call via
  -- transcription.created / summary.created / topics.created /
  -- sentiment.created webhooks.
  transcript          text,
  summary             text,
  topics              text[]  not null default '{}',
  sentiment           text,
  ai                  jsonb   not null default '{}',   -- catch-all: sentiment detail, action items, evaluations

  raw                 jsonb,                           -- last full Aircall payload seen
  synced_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists aircall_calls_started_at_idx   on public.aircall_calls (started_at desc);
create index if not exists aircall_calls_direction_idx     on public.aircall_calls (direction);
create index if not exists aircall_calls_user_email_idx    on public.aircall_calls (lower(user_email));
create index if not exists aircall_calls_number_id_idx     on public.aircall_calls (number_id);
create index if not exists aircall_calls_status_idx        on public.aircall_calls (status);
create index if not exists aircall_calls_caller_number_idx on public.aircall_calls (caller_number);
create index if not exists aircall_calls_missed_idx        on public.aircall_calls (missed) where missed = true;

-- Uniquely named updated_at trigger fn so we never clobber a shared one.
create or replace function public.aircall_set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists aircall_calls_set_updated_at on public.aircall_calls;
create trigger aircall_calls_set_updated_at
  before update on public.aircall_calls
  for each row execute function public.aircall_set_updated_at();

-- RLS: authenticated users can read (dashboard + Realtime); writes only
-- via service-role API routes (webhook + backfill), which bypass RLS.
-- Mirrors the CTM `calls` table.
alter table public.aircall_calls enable row level security;
drop policy if exists "aircall_calls readable by authenticated" on public.aircall_calls;
create policy "aircall_calls readable by authenticated"
  on public.aircall_calls for select to authenticated using (true);

-- Live dashboard: stream inserts/updates to the browser. The
-- supabase_realtime publication is selective (not FOR ALL TABLES), so
-- add this table explicitly.
alter publication supabase_realtime add table public.aircall_calls;

-- Backfill cursor (singleton), mirrors ctm_sync_state.
create table if not exists public.aircall_sync_state (
  id                 text primary key default 'singleton',
  last_synced_at     timestamptz,
  last_call_id       bigint,
  full_backfill_done boolean not null default false,
  note               text,
  updated_at         timestamptz not null default now()
);
alter table public.aircall_sync_state enable row level security;
drop policy if exists "aircall sync state readable by authenticated" on public.aircall_sync_state;
create policy "aircall sync state readable by authenticated"
  on public.aircall_sync_state for select to authenticated using (true);
insert into public.aircall_sync_state (id) values ('singleton') on conflict (id) do nothing;
