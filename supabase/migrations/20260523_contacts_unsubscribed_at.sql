-- Add unsubscribed_at to public.contacts so the email-campaign send
-- pipeline can skip contacts who clicked the unsubscribe link in a
-- previous email, and the "By recipient" view can render their row
-- with a strikethrough + UNSUBSCRIBED badge.

alter table public.contacts
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribed_source text;

create index if not exists contacts_unsubscribed_at_idx
  on public.contacts (unsubscribed_at)
  where unsubscribed_at is not null;

comment on column public.contacts.unsubscribed_at is
  'Set when the contact has unsubscribed from marketing emails. The send pipeline skips contacts where this is not null.';
comment on column public.contacts.unsubscribed_source is
  'How the contact unsubscribed: email-link, manual, etc.';
