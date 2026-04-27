-- Spam flag for contact-form submissions. Lets admins triage
-- obvious junk out of the Forms inbox without hard-deleting it
-- (so we keep an audit trail). The Forms UI hides spam by
-- default and surfaces a "Show spam" toggle.
alter table public.contact_submissions
  add column if not exists is_spam boolean not null default false;

create index if not exists contact_submissions_is_spam_idx
  on public.contact_submissions (is_spam)
  where is_spam = true;
