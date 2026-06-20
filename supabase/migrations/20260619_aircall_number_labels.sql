-- Operator-assigned display names for caller phone numbers. Keyed by
-- the digit-only caller_number (E.164 without +, e.g. 15203677105),
-- matching public.aircall_calls.caller_number. Lets staff name a number
-- so the calls grid + the per-number history page show a friendly label
-- instead of a bare phone number.
create table if not exists public.aircall_number_labels (
  number text primary key,
  name text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- All access goes through the staff-gated /api/aircall/number-label
-- route (service-role admin client, which bypasses RLS). Enable RLS
-- with no permissive policy so the anon/authenticated browser client
-- can't read or write the table directly.
alter table public.aircall_number_labels enable row level security;
