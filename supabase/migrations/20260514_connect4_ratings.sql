-- Connect-4 tournament · Phase 8 · Elo ratings
create table if not exists public.connect4_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  matches_played integer not null default 0,
  tournament_wins integer not null default 0,
  last_match_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists connect4_ratings_rating_idx
  on public.connect4_ratings (rating desc);

alter table public.connect4_ratings enable row level security;
drop policy if exists connect4_ratings_select on public.connect4_ratings;
create policy connect4_ratings_select
  on public.connect4_ratings for select to authenticated using (true);

alter publication supabase_realtime add table public.connect4_ratings;
