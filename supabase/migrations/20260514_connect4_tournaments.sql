-- Connect-4 tournament · Phase 6 · bracket model
--
-- A tournament is a single-elimination ladder over a fixed pool
-- of entrants (4, 8, or 16). Each match in the bracket carries
-- its round + slot so Phase 7 can render the tree and auto-
-- create the next-round match when the prior one resolves.

create table if not exists public.connect4_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size integer not null check (size in (4, 8, 16)),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'complete')),
  winner_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists connect4_tournaments_status_idx
  on public.connect4_tournaments (status);

create table if not exists public.connect4_tournament_entrants (
  tournament_id uuid not null references public.connect4_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seed integer,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index if not exists connect4_tournament_entrants_tournament_idx
  on public.connect4_tournament_entrants (tournament_id);

create table if not exists public.connect4_bracket_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.connect4_tournaments(id) on delete cascade,
  round integer not null check (round >= 0),
  slot integer not null check (slot >= 0),
  match_id uuid references public.connect4_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tournament_id, round, slot)
);

create index if not exists connect4_bracket_matches_tournament_idx
  on public.connect4_bracket_matches (tournament_id);

alter table public.connect4_tournaments enable row level security;
alter table public.connect4_tournament_entrants enable row level security;
alter table public.connect4_bracket_matches enable row level security;

drop policy if exists connect4_tournaments_select on public.connect4_tournaments;
create policy connect4_tournaments_select
  on public.connect4_tournaments for select to authenticated using (true);

drop policy if exists connect4_tournaments_insert on public.connect4_tournaments;
create policy connect4_tournaments_insert
  on public.connect4_tournaments for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists connect4_tournaments_update on public.connect4_tournaments;
create policy connect4_tournaments_update
  on public.connect4_tournaments for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists connect4_entrants_select on public.connect4_tournament_entrants;
create policy connect4_entrants_select
  on public.connect4_tournament_entrants for select to authenticated using (true);

drop policy if exists connect4_entrants_insert on public.connect4_tournament_entrants;
create policy connect4_entrants_insert
  on public.connect4_tournament_entrants for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists connect4_entrants_delete on public.connect4_tournament_entrants;
create policy connect4_entrants_delete
  on public.connect4_tournament_entrants for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists connect4_bracket_select on public.connect4_bracket_matches;
create policy connect4_bracket_select
  on public.connect4_bracket_matches for select to authenticated using (true);

alter publication supabase_realtime add table public.connect4_tournaments;
alter publication supabase_realtime add table public.connect4_tournament_entrants;
alter publication supabase_realtime add table public.connect4_bracket_matches;
