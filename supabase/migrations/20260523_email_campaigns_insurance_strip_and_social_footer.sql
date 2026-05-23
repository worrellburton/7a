-- Two new opt-in modules for the email-campaign builder:
--   include_insurance_strip · Aetna/BCBS/Cigna/Humana/TRICARE logo
--     row near the top of the email so coverage is visible at a
--     glance before the reader decides to scroll.
--   include_social_footer   · Instagram/Facebook/LinkedIn icon row
--     in the footer pointing at the official 7A handles.

alter table public.email_campaigns
  add column if not exists include_insurance_strip boolean not null default false,
  add column if not exists include_social_footer boolean not null default false;

comment on column public.email_campaigns.include_insurance_strip is
  'When true, Claude renders a small Aetna / BCBS / Cigna / Humana / TRICARE logo strip near the top of the email so the reader sees coverage at a glance.';
comment on column public.email_campaigns.include_social_footer is
  'When true, the email footer includes an Instagram / Facebook / LinkedIn icon row linking to the official 7A handles.';
