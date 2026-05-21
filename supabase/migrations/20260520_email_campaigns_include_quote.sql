-- Per-campaign toggle for surfacing a Google review pull-quote
-- inside the rendered email. When on, the build API picks a
-- 5-star, non-hidden Google review (featured first, then by
-- rating + recency), passes the text + author to Claude, and
-- the design brief renders it as a quiet block-quote section
-- between the body and the CTA.

alter table public.email_campaigns
  add column if not exists include_quote boolean not null default false;
