-- Per-directory "requires EIN" flag. Some submission portals
-- (insurance networks, accreditation bodies) make the team paste
-- the business EIN as part of the application. Knowing this up
-- front lets the team queue these rows together and pull the EIN
-- from the safe in one batch instead of round-tripping every time.
-- Mirrors the requires_2fa shape: boolean + by/at attribution.
ALTER TABLE public.directory_states
  ADD COLUMN IF NOT EXISTS requires_ein boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_ein_set_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_ein_set_at timestamptz;
