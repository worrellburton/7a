-- Schedule send: a campaign can sit in status='scheduled' with a
-- future scheduled_send_at; the cron route picks them up at the
-- right minute and fires the regular send pipeline.

alter table public.email_campaigns
  add column if not exists scheduled_send_at timestamptz;

create index if not exists email_campaigns_scheduled_send_at_idx
  on public.email_campaigns (scheduled_send_at)
  where scheduled_send_at is not null and status = 'scheduled';

comment on column public.email_campaigns.scheduled_send_at is
  'When a scheduled campaign should fire. The cron route picks up rows with status=scheduled and scheduled_send_at <= now().';
