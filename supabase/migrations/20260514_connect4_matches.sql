-- Connect-4 tournament · Phase 1 · base schema
--
-- Each match is one head-to-head game between two users. The
-- board state lives in `moves` as an array of column indexes
-- (0-6), newest move last. Rebuilding the board from the moves
-- list keeps the row tiny + cheap to subscribe to via realtime.
-- The current player's turn is derived from moves.length % 2:
-- even = challenger, odd = opponent.
--
-- winner_id is null until the match resolves (six-in-a-row or
-- draw). status is the human-readable enum the UI gates off:
--   open      — created, awaiting opponent to accept
--   active    — both players in, moves in progress
--   complete  — winner determined OR draw
--   forfeit   — one player walked away
--
-- created_by always denotes the challenger (player 1, red).

create table if not exists public.connect4_matches (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users(id) on delete cascade,
  opponent_id   uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'active', 'complete', 'forfeit')),
  moves integer[] not null default '{}',
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connect4_matches_distinct_players check (challenger_id <> opponent_id)
);

create index if not exists connect4_matches_status_idx
  on public.connect4_matches (status);
create index if not exists connect4_matches_challenger_idx
  on public.connect4_matches (challenger_id);
create index if not exists connect4_matches_opponent_idx
  on public.connect4_matches (opponent_id);

alter table public.connect4_matches enable row level security;

drop policy if exists connect4_matches_select on public.connect4_matches;
create policy connect4_matches_select
  on public.connect4_matches for select
  to authenticated using (true);

drop policy if exists connect4_matches_insert on public.connect4_matches;
create policy connect4_matches_insert
  on public.connect4_matches for insert
  to authenticated with check (auth.uid() = challenger_id);

drop policy if exists connect4_matches_update on public.connect4_matches;
create policy connect4_matches_update
  on public.connect4_matches for update
  to authenticated using (auth.uid() in (challenger_id, opponent_id))
                with check (auth.uid() in (challenger_id, opponent_id));
