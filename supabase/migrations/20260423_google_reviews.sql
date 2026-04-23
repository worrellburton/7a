-- DB-backed Google Places review cache. Google's Places Details API
-- caps at 5 reviews per call, so to grow the displayed corpus past
-- that we cache every review we see and let it accumulate over time
-- (a hourly sync cron in a follow-up phase will refresh and rotate
-- the seen set). Google Maps Platform ToS allows caching for up to
-- 30 days — the same sync cron evicts rows where fetched_at is older.
--
-- Unique (place_id, author_name, review_time) is the natural key:
-- Places doesn't expose a stable review id, but the tuple is stable
-- across calls. place_id is in the schema even though we only have
-- one location today, so adding more facilities later is just inserts.

create table if not exists public.google_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  author_name text not null,
  profile_photo_url text,
  rating integer not null check (rating between 1 and 5),
  relative_time text,
  text text,
  review_time timestamptz not null,
  language text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists google_reviews_unique_idx
  on public.google_reviews (place_id, author_name, review_time);

create index if not exists google_reviews_review_time_idx
  on public.google_reviews (review_time desc);

create index if not exists google_reviews_rating_idx
  on public.google_reviews (rating);

create index if not exists google_reviews_fetched_at_idx
  on public.google_reviews (fetched_at);

create or replace function public.google_reviews_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists google_reviews_updated_at on public.google_reviews;
create trigger google_reviews_updated_at
  before update on public.google_reviews
  for each row execute function public.google_reviews_set_updated_at();
