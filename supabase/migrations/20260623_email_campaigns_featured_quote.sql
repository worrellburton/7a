-- Let a campaign pin a SPECIFIC Google review as its pull-quote instead of
-- the build route always auto-picking the top one. Nullable + ON DELETE SET
-- NULL because google_reviews rows rotate/evict (30-day ToS TTL): if the
-- chosen review is gone at build time the route falls back to the auto-pick.
alter table public.email_campaigns
  add column if not exists featured_quote_id uuid references public.google_reviews(id) on delete set null;

create index if not exists email_campaigns_featured_quote_id_idx
  on public.email_campaigns (featured_quote_id);
