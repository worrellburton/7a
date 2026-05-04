-- Per-directory "requires 2FA" flag. Some submission portals (insurance
-- networks, accreditation bodies, payer directories) gate logins behind
-- 2FA codes that get sent to a single phone — knowing this up front lets
-- the team batch those rows together when whoever holds the phone is
-- around. Boolean only; the team flips it as they discover gates while
-- working through the list.
ALTER TABLE public.directory_states
  ADD COLUMN IF NOT EXISTS requires_2fa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_2fa_set_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_2fa_set_at timestamptz;
