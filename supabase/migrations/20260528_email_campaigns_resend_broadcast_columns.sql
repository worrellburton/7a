-- Switch the campaign send path from Resend's transactional /emails
-- endpoint to the Marketing/Broadcasts API. The Broadcast API takes
-- an audience_id (a saved list of contacts) + a single HTML body and
-- fans it out server-side, so we no longer pay the per-recipient
-- transactional-quota cost. Each campaign send gets its own audience
-- (we filter unsubscribes before the upsert) + one broadcast row.
alter table public.email_campaigns
  add column if not exists resend_audience_id text,
  add column if not exists resend_broadcast_id text;

create index if not exists email_campaigns_resend_broadcast_idx
  on public.email_campaigns (resend_broadcast_id) where resend_broadcast_id is not null;
