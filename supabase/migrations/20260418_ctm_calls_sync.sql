-- Mirror of CallTrackingMetrics (CTM) calls into Supabase.
-- The Calls page currently paginates CTM directly, so any aggregate stat
-- (Meaningful, Spam, Missed, etc.) only sees whatever's been loaded. By
-- syncing into this table we get canonical counts and durable joins to
-- call_ai_scores without refetching CTM on every render.
--
-- ctm_id is the stable CTM call identifier (number in their API).
-- `raw` keeps the full CTM payload so we can surface extra fields later
-- without another migration.

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  ctm_id text not null unique,
  account_id text,

  called_at timestamptz not null,
  direction text,
  duration integer,
  talk_time integer,
  ring_time integer,
  voicemail boolean default false,
  status text,
  first_call boolean,

  caller_number text,
  caller_number_formatted text,
  receiving_number text,
  receiving_number_formatted text,
  tracking_number text,
  tracking_number_formatted text,

  source text,
  source_name text,
  tracking_label text,
  tag_list text[],

  city text,
  state text,
  country text,
  zip text,

  audio_url text,
  transcript_url text,
  caller_name text,

  raw jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_called_at_idx on public.calls (called_at desc);
create index if not exists calls_caller_number_idx on public.calls (caller_number);
create index if not exists calls_receiving_number_idx on public.calls (receiving_number);
create index if not exists calls_source_idx on public.calls (source);
create index if not exists calls_direction_idx on public.calls (direction);

create or replace function public.calls_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
  before update on public.calls
  for each row
  execute function public.calls_set_updated_at();

alter table public.calls enable row level security;

-- Authenticated users can read; writes happen via service-role sync job.
drop policy if exists "calls readable by authenticated" on public.calls;
create policy "calls readable by authenticated"
  on public.calls
  for select
  to authenticated
  using (true);

-- Spam list: previously lived in localStorage. Now persisted so every
-- user of the account shares the same spam classification.
create table if not exists public.call_spam_numbers (
  id uuid primary key default gen_random_uuid(),
  account_id text,
  phone_normalized text not null,
  reported_by uuid references auth.users(id) on delete set null,
  reported_at timestamptz not null default now(),
  unique (account_id, phone_normalized)
);

create index if not exists call_spam_numbers_phone_idx on public.call_spam_numbers (phone_normalized);

alter table public.call_spam_numbers enable row level security;

drop policy if exists "spam readable by authenticated" on public.call_spam_numbers;
create policy "spam readable by authenticated"
  on public.call_spam_numbers
  for select
  to authenticated
  using (true);

drop policy if exists "spam insertable by authenticated" on public.call_spam_numbers;
create policy "spam insertable by authenticated"
  on public.call_spam_numbers
  for insert
  to authenticated
  with check (true);

drop policy if exists "spam deletable by authenticated" on public.call_spam_numbers;
create policy "spam deletable by authenticated"
  on public.call_spam_numbers
  for delete
  to authenticated
  using (true);

-- Track the watermark of the last successful CTM sync so we can fetch
-- only new calls on subsequent runs.
create table if not exists public.ctm_sync_state (
  id integer primary key default 1,
  last_called_at timestamptz,
  last_synced_at timestamptz,
  last_page integer,
  inserted_total bigint default 0,
  updated_total bigint default 0,
  constraint ctm_sync_state_singleton check (id = 1)
);

insert into public.ctm_sync_state (id) values (1)
on conflict (id) do nothing;

alter table public.ctm_sync_state enable row level security;

drop policy if exists "sync state readable by authenticated" on public.ctm_sync_state;
create policy "sync state readable by authenticated"
  on public.ctm_sync_state
  for select
  to authenticated
  using (true);
