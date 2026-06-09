-- Add 'scheduled' to the allowed status set so the Schedule Send
-- modal can park a campaign for later. The existing
-- /api/email-campaigns/schedule route already writes
-- status='scheduled' on success; without this fix, every
-- attempt blew up with a 23514 check-constraint violation in the
-- DONE button on the modal.
alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;

alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status = any (array[
    'draft'::text,
    'recipients'::text,
    'finalizing'::text,
    'scheduled'::text,
    'sending'::text,
    'sent'::text,
    'failed'::text
  ]));
