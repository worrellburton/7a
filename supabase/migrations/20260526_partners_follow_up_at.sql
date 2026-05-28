alter table public.partners
  add column if not exists follow_up_at timestamptz;

create index if not exists partners_follow_up_at_idx
  on public.partners (follow_up_at) where follow_up_at is not null;
