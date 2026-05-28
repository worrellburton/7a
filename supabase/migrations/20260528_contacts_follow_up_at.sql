alter table public.contacts
  add column if not exists follow_up_at timestamptz;

create index if not exists contacts_follow_up_at_idx
  on public.contacts (follow_up_at) where follow_up_at is not null;
