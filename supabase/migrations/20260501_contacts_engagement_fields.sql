-- Extend public.contacts with the CRM-style engagement fields the
-- Contacts page surfaces in its grid. The base table was created by
-- the Partnerships build (downgrade-to-contact destination); these
-- columns add role/phone/email + last-contact tracking so admissions
-- can see at a glance who hasn't been touched in a while.

alter table public.contacts
  add column if not exists role text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists last_contact_at timestamptz,
  add column if not exists last_contact_by uuid references public.users(id),
  add column if not exists last_contact_method text,
  add column if not exists last_contact_comments text;

alter table public.contacts
  drop constraint if exists contacts_last_contact_method_check;
alter table public.contacts
  add constraint contacts_last_contact_method_check
  check (last_contact_method is null or last_contact_method in ('Phone', 'In Person', 'Left Message'));

create table if not exists public.contact_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  method text not null check (method in ('Phone', 'In Person', 'Left Message')),
  comments text,
  contacted_by uuid references public.users(id),
  contacted_at timestamptz not null default now()
);
create index if not exists contact_logs_contact_id_idx on public.contact_logs(contact_id, contacted_at desc);

alter table public.contact_logs enable row level security;

drop policy if exists contact_logs_select_authed on public.contact_logs;
create policy contact_logs_select_authed
  on public.contact_logs for select to authenticated using (true);

drop policy if exists contact_logs_write_authed on public.contact_logs;
create policy contact_logs_write_authed
  on public.contact_logs for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contacts'
  ) then
    execute 'alter publication supabase_realtime add table public.contacts';
  end if;
end $$;
