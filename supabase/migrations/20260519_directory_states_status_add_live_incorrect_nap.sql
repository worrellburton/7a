-- The directory_states.status CHECK was authored before the
-- "Live but incorrect NAP" status existed. Selecting that option in
-- the UI was getting rejected by the DB, the upsert handler caught
-- the constraint violation, and the row rolled back to its previous
-- value ("Live") — hiding the bug behind what looked like a UI revert.
-- Extend the CHECK so the new status persists.
ALTER TABLE public.directory_states
  DROP CONSTRAINT IF EXISTS directory_states_status_check;

ALTER TABLE public.directory_states
  ADD CONSTRAINT directory_states_status_check
  CHECK (status IN (
    'todo',
    'claim_in_process',
    'claimed',
    'submitted',
    'pending',
    'live',
    'live_incorrect_nap',
    'paid_list',
    'no_option',
    'requires_official_docs',
    'skip'
  ));
