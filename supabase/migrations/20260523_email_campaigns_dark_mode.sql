-- New toggle in the email-campaign builder: a dark/light mode
-- switch that flips the entire body palette. Claude reads it as a
-- top-of-prompt directive (see PILLAR 3 in build/route.ts) and
-- chooses Desert Dusk + Bone instead of Sand + Ink.

alter table public.email_campaigns
  add column if not exists dark_mode boolean not null default false;

comment on column public.email_campaigns.dark_mode is
  'When true, Claude renders the email body with a dark palette (Desert Dusk background, Bone text) instead of the default light Sand surface.';
