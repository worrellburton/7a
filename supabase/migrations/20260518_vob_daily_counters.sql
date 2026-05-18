-- Per-day VOB submission counter used for the email subject line
-- ("VOB - Name - Date - #N"). Storing the count (and just the count)
-- isn't PHI — there's no client identity in this table, no time of
-- day, just an integer keyed by the Arizona-local calendar date.
--
-- The date column is named `day` to avoid collision with the SQL
-- reserved word `date`. The counter is incremented atomically by the
-- companion increment_vob_count_for_today() function so two near-
-- simultaneous form submissions can never read the same number.
create table if not exists public.vob_daily_counters (
  day date primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Atomic increment helper. Returns the post-increment count so the
-- caller can use it in the email subject without a follow-up read.
-- `current_date` is computed in the centre's local timezone
-- (America/Phoenix) so the day rolls over at midnight Arizona time,
-- not midnight UTC.
create or replace function public.increment_vob_count_for_today()
returns integer
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.vob_daily_counters (day, count, updated_at)
  values ((now() at time zone 'America/Phoenix')::date, 1, now())
  on conflict (day) do update
    set count = vob_daily_counters.count + 1,
        updated_at = now()
  returning count;
$$;

-- Only the service-role client (used by /api/public/vob) needs to
-- call this. RLS is enabled but no policies are added — service role
-- bypasses RLS, anon role is locked out by default.
alter table public.vob_daily_counters enable row level security;
