-- Mirrors the contact-history pattern (contact_logs + contacts.last_contact_*)
-- onto partners so admissions can log/replay every interaction with each
-- clinical partner the same way they do with leads.

alter table public.partners
  add column if not exists last_contact_at timestamptz,
  add column if not exists last_contact_by uuid references public.users(id),
  add column if not exists last_contact_method text,
  add column if not exists last_contact_comments text;

alter table public.partners
  drop constraint if exists partners_last_contact_method_check;
alter table public.partners
  add constraint partners_last_contact_method_check
  check (last_contact_method is null or last_contact_method in ('Phone', 'In Person', 'Left Message'));

create table if not exists public.partner_logs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  method text not null check (method in ('Phone', 'In Person', 'Left Message')),
  comments text,
  contacted_by uuid references public.users(id),
  contacted_at timestamptz not null default now()
);
create index if not exists partner_logs_partner_id_idx on public.partner_logs(partner_id, contacted_at desc);

alter table public.partner_logs enable row level security;

drop policy if exists partner_logs_select_authed on public.partner_logs;
create policy partner_logs_select_authed
  on public.partner_logs for select to authenticated using (true);

drop policy if exists partner_logs_write_authed on public.partner_logs;
create policy partner_logs_write_authed
  on public.partner_logs for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partners'
  ) then
    execute 'alter publication supabase_realtime add table public.partners';
  end if;
end $$;
