-- Per-directory NAP audit. Each row records the Name / Address /
-- Phone that was actually deployed at the listing site, so the team
-- can audit consistency against the canonical NAP in business_info
-- (mismatched NAP is a documented local-SEO ranking penalty). All
-- three fields are nullable — a row with status='live' but no NAP
-- recorded means "we know it's live, we haven't audited NAP yet."
ALTER TABLE public.directory_states
  ADD COLUMN IF NOT EXISTS nap_name text,
  ADD COLUMN IF NOT EXISTS nap_address text,
  ADD COLUMN IF NOT EXISTS nap_phone text,
  ADD COLUMN IF NOT EXISTS nap_set_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nap_set_at timestamptz;
