-- Expand arcade_scores.game check constraint to allow the new
-- Salutogenic Uplifter game key (leaderboard = total uplift given).
alter table public.arcade_scores
  drop constraint if exists arcade_scores_game_check;

alter table public.arcade_scores
  add constraint arcade_scores_game_check
  check (game in ('trail_ride','feather_catcher','saddle_sudoku','connect_four','salutogenic_uplifter'));
