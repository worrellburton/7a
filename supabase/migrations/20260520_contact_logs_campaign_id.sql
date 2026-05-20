-- Link contact_logs rows back to the email campaign that created
-- them so the Contact-history timeline can render "Sent email
-- campaign: <subject>" entries as a clickable link to the
-- campaign's finalize page.
--
-- Nullable + ON DELETE SET NULL — the column only applies to
-- method='Email Campaign' rows, and we don't want a campaign
-- deletion to lose the touchpoint record itself.

alter table public.contact_logs
  add column if not exists campaign_id uuid
  references public.email_campaigns(id) on delete set null;

create index if not exists contact_logs_campaign_id_idx
  on public.contact_logs(campaign_id)
  where campaign_id is not null;

-- Backfill: every existing 'Email Campaign' log lines up
-- contact_id + contacted_at one-to-one with the matching
-- email_campaign_recipients row that generated it (the send route
-- writes both with the same now() snapshot), so an exact join is
-- enough — no time-window heuristic required.
update public.contact_logs cl
   set campaign_id = ecr.campaign_id
  from public.email_campaign_recipients ecr
 where cl.campaign_id is null
   and cl.method = 'Email Campaign'
   and cl.contact_id = ecr.contact_id
   and ecr.sent_at = cl.contacted_at;

-- Auto-link future 'Email Campaign' inserts to their campaign
-- using the same (contact_id, sent_at = contacted_at) pairing.
-- Keeps the column populated even if the send route doesn't set
-- it explicitly — the recipients row is updated immediately
-- before the contact_logs row in the send loop, so the lookup
-- always finds a match.
create or replace function public.contact_logs_link_email_campaign()
returns trigger
language plpgsql
as $$
begin
  if new.method = 'Email Campaign' and new.campaign_id is null then
    select ecr.campaign_id into new.campaign_id
      from public.email_campaign_recipients ecr
     where ecr.contact_id = new.contact_id
       and ecr.sent_at = new.contacted_at
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists contact_logs_link_email_campaign on public.contact_logs;
create trigger contact_logs_link_email_campaign
  before insert on public.contact_logs
  for each row execute function public.contact_logs_link_email_campaign();
