-- Arcade · per-game score submissions.
-- One row per attempt. Leaderboards select max(score) per (game,user),
-- so duplicate submits never inflate a player's standing. Daily-puzzle
-- games (saddle_sudoku) carry the puzzle id in meta.puzzle_date so a
-- separate "today only" leaderboard can be sliced from the same table.

create table if not exists public.arcade_scores (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('trail_ride','feather_catcher','saddle_sudoku')),
  user_id uuid not null references public.users(id) on delete cascade,
  score integer not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arcade_scores_game_score_idx on public.arcade_scores (game, score desc, created_at desc);
create index if not exists arcade_scores_user_idx on public.arcade_scores (user_id, created_at desc);
create index if not exists arcade_scores_puzzle_idx on public.arcade_scores (game, ((meta->>'puzzle_date'))) where meta ? 'puzzle_date';

alter table public.arcade_scores enable row level security;

-- Anyone signed in can read every score (leaderboards are public to
-- the team + alumni community).
drop policy if exists arcade_scores_read on public.arcade_scores;
create policy arcade_scores_read on public.arcade_scores
  for select to authenticated using (true);

-- Authenticated users can only insert their own scores.
drop policy if exists arcade_scores_insert on public.arcade_scores;
create policy arcade_scores_insert on public.arcade_scores
  for insert to authenticated with check (auth.uid() = user_id);
