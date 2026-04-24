-- Public-site form capture. Two tables, one per form on the public
-- site: VOB (insurance verification) and the generic contact /
-- payment-method form. Kept separate tables because the collected
-- fields differ meaningfully — a VOB carries an insurance provider
-- (and eventually card photos), while a contact form carries a
-- payment method + consent boolean.
--
-- Both tables are admin-read-only; anon INSERTs via the /api/public
-- routes go through the service-role client on the server so RLS
-- stays restrictive for direct reads.

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


-- Unified capture for every non-VOB public form:
--   source='contact_page' → ContactPageForm on /contact (has message)
--   source='footer'       → Footer form globally (has payment_method + consent)
--   source='exit_intent'  → ExitIntentModal (email only when it lands)
--   source='other'        → catch-all for future forms so nothing 500s
--                            if a new form posts before the enum grows
-- Many columns are nullable by design because different forms
-- surface different subsets of fields.
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('contact_page','footer','exit_intent','other')),
  first_name text,
  last_name text,
  phone text,
  email text,
  message text,
  payment_method text check (payment_method in ('insurance','private-pay','other') or payment_method is null),
  consent boolean not null default false,
  page_url text,
  user_agent text,
  status text not null default 'new' check (status in ('new','contacted','closed','archived')),
  notes text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists form_submissions_source_idx on public.form_submissions (source);

create index if not exists form_submissions_received_at_idx on public.form_submissions (received_at desc);
create index if not exists form_submissions_status_idx      on public.form_submissions (status);

create or replace function public.form_submissions_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists form_submissions_updated_at on public.form_submissions;
create trigger form_submissions_updated_at
  before update on public.form_submissions
  for each row execute function public.form_submissions_set_updated_at();
