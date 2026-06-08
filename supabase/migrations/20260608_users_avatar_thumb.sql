-- public.users.avatar_thumb
--
-- Tiny 60x60 WebP avatar stored inline as a `data:image/webp;base64,...`
-- string. The home orbit renders dozens of avatars in a circle; fetching
-- each one over HTTP — even via the Supabase image-transform endpoint —
-- adds ~50 round-trips before the screen settles. With the bytes living
-- on the user row itself, the orbit paints with zero per-avatar
-- requests as soon as the user list arrives.
--
-- Population:
--   - On avatar upload, the browser generates a 60x60 WebP via Canvas
--     and writes it to this column alongside avatar_url.
--   - One-time backfill for existing users runs through
--     /api/admin/avatars/backfill-thumbs (admin-only, uses sharp).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_thumb text;

COMMENT ON COLUMN public.users.avatar_thumb IS
  '60x60 WebP avatar inlined as data:image/webp;base64,... — drives the home orbit so it paints without a per-avatar HTTP fetch.';
