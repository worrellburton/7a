-- Public contact form submissions. Written by the anon role from
-- /api/public/contact when a visitor completes the contact form on
-- /contact (and the Contact section embedded in other marketing
-- pages). Read access is restricted to service role / authenticated
-- admin users; anon has insert-only so the public web form can
-- record a row without exposing the full table.

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text,
  email text not null,
  telephone text,
  payment_method text,
  message text,
  -- Metadata captured server-side (not user-provided)
  user_agent text,
  referrer text
);

alter table public.contact_submissions enable row level security;

-- Anon role can insert new rows (the public form). No update or
-- delete rights; all reads go through service-role (admin tools).
drop policy if exists "anon insert contact" on public.contact_submissions;
create policy "anon insert contact"
  on public.contact_submissions
  for insert
  to anon
  with check (true);

-- Authenticated users (staff logged into /app) can read submissions.
drop policy if exists "authed read contact" on public.contact_submissions;
create policy "authed read contact"
  on public.contact_submissions
  for select
  to authenticated
  using (true);
