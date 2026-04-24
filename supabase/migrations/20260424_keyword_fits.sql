-- Per-keyword "current fit" cache.
--
-- For each keyword in src/lib/seo/keywords.ts we want a score that
-- reflects how well the live site currently targets that term: does
-- any page actually put the phrase in its H1/title/URL/body? The
-- admin console reads this table to render the "Fit" column next to
-- the SerpAPI rank.
--
-- One row per keyword. A fit scan (POST /api/seo/keywords/fit/scan)
-- crawls the public routes, computes per-keyword scores, and upserts
-- every row in a single transaction. Cheap to recompute — the read
-- side just does `select *` and the UI stays fast.

create table if not exists public.keyword_fits (
  keyword_id    text primary key,
  score         smallint not null default 0,
  bucket        text not null default 'none',
  best_url      text,
  best_h1       text,
  best_title    text,
  breakdown     jsonb not null default '{}'::jsonb,
  scanned_at    timestamptz not null default now()
);

create index if not exists keyword_fits_score_idx on public.keyword_fits (score desc);
create index if not exists keyword_fits_scanned_at_idx on public.keyword_fits (scanned_at desc);

alter table public.keyword_fits enable row level security;
-- Reads via service role (admin console + middleware pattern) only.
