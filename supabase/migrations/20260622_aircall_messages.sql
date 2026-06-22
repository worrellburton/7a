-- SMS / text messages mirrored from Aircall (Business Text Messaging).
-- Inbound + outbound messages land here via the /api/aircall/webhook
-- (message.* / group_message.* events); the Calls page renders them as
-- threaded conversations keyed by the contact's phone number. Mirrors the
-- aircall_calls table's staff-only RLS + realtime setup.
create table if not exists public.aircall_messages (
  id                 uuid primary key default gen_random_uuid(),
  aircall_message_id text unique,        -- Aircall's message id; null until known
  direction          text,              -- 'inbound' | 'outbound'
  status             text,              -- received | sent | delivered | failed | ...
  channel            text,              -- 'sms' | 'mms' | 'whatsapp'
  number_id          bigint,            -- the Aircall line the message went through
  number_name        text,
  number_digits      text,
  contact_number     text,              -- the OTHER party, digits-only (thread key)
  raw_to             text,
  raw_from           text,
  body               text,
  media_url          text,
  user_id            bigint,            -- agent who sent (outbound)
  user_name          text,
  sent_at            timestamptz,
  received_at        timestamptz,
  raw                jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists aircall_messages_contact_idx on public.aircall_messages (contact_number, created_at desc);
create index if not exists aircall_messages_number_idx on public.aircall_messages (number_id);
create index if not exists aircall_messages_created_idx on public.aircall_messages (created_at desc);

-- Reuse the aircall updated_at trigger fn created with aircall_calls.
drop trigger if exists aircall_messages_set_updated_at on public.aircall_messages;
create trigger aircall_messages_set_updated_at
  before update on public.aircall_messages
  for each row execute function public.aircall_set_updated_at();

-- RLS: staff-only reads (caller PII), mirrors the hardened aircall_calls
-- select policy. Writes only via the service-role webhook + send routes.
alter table public.aircall_messages enable row level security;
drop policy if exists aircall_messages_select_staff on public.aircall_messages;
create policy aircall_messages_select_staff
  on public.aircall_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.is_admin = true
             or u.is_super_admin = true
             or coalesce(u.user_kind, 'staff') = 'staff')
    )
  );

-- Live updates to the browser (selective publication — add explicitly).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'aircall_messages'
  ) then
    alter publication supabase_realtime add table public.aircall_messages;
  end if;
end $$;
