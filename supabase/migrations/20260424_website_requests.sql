-- Public-site capture layer.
--
-- This migration adds the insurance-verification half (public.vob_requests)
-- and extends the existing public.contact_submissions table (from
-- 20260423_contact_submissions.sql) with the columns the new admin
-- "Website Requests" pages need:
--
--   source     — which form on the site produced the row
--                ('contact_page', 'footer', 'exit_intent', 'other')
--   consent    — boolean the Footer form collects for SMS/call consent
--   page_url   — full URL captured client-side for provenance
--   status     — 'new' | 'contacted' | 'closed' | 'archived'
--                so admins can walk submissions without a second table
--
-- The existing first_name / last_name / email / telephone /
-- payment_method / message columns on contact_submissions stay as
-- master authored them; we only add.

-- ----- VOBs (insurance verification) -----
create table if not exists public.vob_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  insurance_provider text,
  status text not null default 'new' check (status in ('new','contacted','verified','not_eligible','archived')),
  notes text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vob_requests_received_at_idx on public.vob_requests (received_at desc);
create index if not exists vob_requests_status_idx      on public.vob_requests (status);

create or replace function public.vob_requests_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists vob_requests_updated_at on public.vob_requests;
create trigger vob_requests_updated_at
  before update on public.vob_requests
  for each row execute function public.vob_requests_set_updated_at();

-- Anon insert-only; reads are admin via service-role.
alter table public.vob_requests enable row level security;
drop policy if exists "anon insert vob" on public.vob_requests;
create policy "anon insert vob"
  on public.vob_requests
  for insert
  to anon
  with check (true);

-- ----- Extend contact_submissions with source/consent/page_url/status -----
alter table public.contact_submissions
  add column if not exists source text default 'contact_page' check (source in ('contact_page','footer','exit_intent','other')),
  add column if not exists consent boolean not null default false,
  add column if not exists page_url text,
  add column if not exists status text not null default 'new' check (status in ('new','contacted','closed','archived')),
  add column if not exists notes text;

create index if not exists contact_submissions_source_idx on public.contact_submissions (source);
create index if not exists contact_submissions_status_idx on public.contact_submissions (status);
