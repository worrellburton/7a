-- Public team page fields.
--   bio          : short marketing bio shown on /who-we-are/meet-our-team/<slug>
--   public_team  : when true, the user appears on the public team page
--                  (defaults true so existing staff start visible — admins
--                  can hide individuals from the team page in the portal).
--   public_slug  : URL slug for the individual team page; auto-derived from
--                  full_name when null but stored so admins can override.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS public_team boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS users_public_slug_key
  ON public.users (public_slug)
  WHERE public_slug IS NOT NULL;

-- Allow the anon role to read the columns the public team page needs.
-- Existing RLS already restricts the rest of the table; this policy is
-- additive and limited to active, opted-in profiles.
DROP POLICY IF EXISTS "Public team profiles are visible to anon" ON public.users;
CREATE POLICY "Public team profiles are visible to anon"
  ON public.users
  FOR SELECT
  TO anon
  USING (status = 'active' AND public_team = true);
