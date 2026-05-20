-- Per-campaign toggle for surfacing the Seven Arrows admissions
-- phone number ((866) 718-1665) inside the rendered email. The
-- builder UI has a third toggle row alongside "Use logos" and
-- "Link to website"; the build API reads this column and instructs
-- Claude to drop the number into a visible row (header strip or
-- pre-CTA strap) when it is on.

alter table public.email_campaigns
  add column if not exists include_phone boolean not null default false;
