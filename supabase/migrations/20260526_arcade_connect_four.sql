-- Expand arcade_scores.game check constraint to allow the new
-- Connect Four entries. Existing rows for the other three games
-- stay valid because they're already in the allowed set.

alter table public.arcade_scores
  drop constraint if exists arcade_scores_game_check;

alter table public.arcade_scores
  add constraint arcade_scores_game_check
  check (game in ('trail_ride','feather_catcher','saddle_sudoku','connect_four'));
