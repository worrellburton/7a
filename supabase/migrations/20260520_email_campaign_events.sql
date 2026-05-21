-- Resend webhook event log + lookup helpers for email-campaign
-- analytics. Resend's GET /emails/{id} endpoint lags reality badly —
-- the supported pattern is to subscribe to webhook events (sent /
-- delivered / opened / clicked / bounced / complained / failed /
-- delivery_delayed) and aggregate from a local table.
--
-- Each row is one event Resend POSTed to us. svix_id is the Svix
-- delivery id we use as the idempotency key (Resend retries the
-- same event until it gets a 2xx; without idempotency we'd
-- double-count opens). recipient_id / campaign_id are populated by
-- looking the provider_message_id up against email_campaign_sends.

create table if not exists public.email_campaign_events (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null,
  recipient_id uuid references public.email_campaign_recipients(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  svix_id text unique,
  received_at timestamptz not null default now()
);

create index if not exists email_campaign_events_recipient_type_idx
  on public.email_campaign_events(recipient_id, event_type);
create index if not exists email_campaign_events_campaign_type_idx
  on public.email_campaign_events(campaign_id, event_type);
create index if not exists email_campaign_events_message_idx
  on public.email_campaign_events(provider_message_id);

alter table public.email_campaign_events enable row level security;

-- The webhook endpoint writes via the service-role key, so no
-- INSERT policy is needed. Admins read aggregated data through
-- /api/email-campaigns/[id]/analytics which also uses the
-- service role; we still expose a SELECT policy so any admin
-- session-key client can read the raw rows if they need to
-- diagnose without going through the API.
drop policy if exists email_campaign_events_select_authed on public.email_campaign_events;
create policy email_campaign_events_select_authed
  on public.email_campaign_events for select to authenticated using (true);
