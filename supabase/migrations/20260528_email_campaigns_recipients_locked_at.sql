alter table public.email_campaigns
  add column if not exists recipients_locked_at timestamptz;

-- Backfill: any campaign already in 'scheduled' status today should
-- treat its updated_at as the lock moment so the new
-- "Add new contacts to scheduled" action doesn't double-add
-- everyone who's already in the recipient list.
update public.email_campaigns
set recipients_locked_at = updated_at
where status = 'scheduled' and recipients_locked_at is null;
