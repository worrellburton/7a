-- Expand directory_states to support the workflow we built in the UI:
--
--   * Newer statuses: 'need_credentials' (blocked on creds), 'claim_in_process'
--     (mid-flight), 'live' (listing publicly visible — distinct from 'listed'
--     which we keep meaning "submitted/approved").
--   * Per-row paid tracking: bool flag + optional dollar amount when known.
--
-- The original CHECK only allowed todo/pending/listed/skip, so the dropdown
-- additions silently failed to persist. Drop and recreate with the full set.

alter table public.directory_states
  drop constraint if exists directory_states_status_check;

alter table public.directory_states
  add constraint directory_states_status_check
  check (status in (
    'todo',
    'need_credentials',
    'claim_in_process',
    'pending',
    'listed',
    'live',
    'skip'
  ));

alter table public.directory_states
  add column if not exists paid boolean not null default false;

-- Numeric so we can sum across listings later. Stored in dollars (no
-- currency column — every directory we track bills USD).
alter table public.directory_states
  add column if not exists paid_amount numeric;

alter table public.directory_states
  add column if not exists paid_set_by uuid references public.users(id);

alter table public.directory_states
  add column if not exists paid_set_at timestamptz;
