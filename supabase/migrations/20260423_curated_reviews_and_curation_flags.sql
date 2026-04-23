-- Phase 11/20 — schema for the unified review system + admin
-- curation. Two changes:
--   1. New public.curated_reviews table for in-house alumni/family
--      quotes admins manage manually (the ones currently hardcoded
--      in src/lib/curatedReviews.ts that phase 12 will seed).
--   2. featured / hidden / display_order added to public.google_reviews
--      so admins can curate the synced Google corpus too — hide an
--      off-message review without deleting it (so the next sync
--      doesn't just re-insert it), or feature a particularly strong
--      one to bias the carousel.
--
-- Two tables not one because the natural keys differ — Google rows
-- have (place_id, author_name, review_time), curated rows have just
-- author_name. Also the 30-day ToS TTL only applies to the Google
-- cache, not to authored content.

create table if not exists public.curated_reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  attribution text,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  featured boolean not null default false,
  hidden boolean not null default false,
  display_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curated_reviews_hidden_idx on public.curated_reviews (hidden);
create index if not exists curated_reviews_featured_idx on public.curated_reviews (featured) where featured = true;
create index if not exists curated_reviews_display_order_idx on public.curated_reviews (display_order);

create or replace function public.curated_reviews_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists curated_reviews_updated_at on public.curated_reviews;
create trigger curated_reviews_updated_at
  before update on public.curated_reviews
  for each row execute function public.curated_reviews_set_updated_at();

alter table public.google_reviews add column if not exists featured boolean not null default false;
alter table public.google_reviews add column if not exists hidden boolean not null default false;
alter table public.google_reviews add column if not exists display_order integer;

create index if not exists google_reviews_hidden_idx on public.google_reviews (hidden);
create index if not exists google_reviews_featured_idx on public.google_reviews (featured) where featured = true;
