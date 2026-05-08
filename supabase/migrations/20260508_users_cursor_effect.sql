-- Each user picks one of ten cursor effects on /app/profile → Cursor.
-- The chosen value is broadcast over the realtime presence channel
-- so every other client renders this user's cursor with the same
-- effect. CHECK constraint enforces the catalogued set so a typo on
-- the client can't slip a bad render-mode into the broadcast.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cursor_effect text NOT NULL DEFAULT 'classic';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_cursor_effect_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_cursor_effect_check
  CHECK (cursor_effect IN (
    'classic',  -- bare dot + name label, no trail
    'flame',    -- the existing fire-tail trail
    'comet',    -- tapered solid tail
    'sparkle',  -- tiny sparkle particles around the cursor
    'bubbles',  -- circle particles rising from the cursor
    'glow',     -- soft radial halo
    'rainbow',  -- cursor cycles through hues
    'lightning',-- zigzag tail
    'dots',     -- fading dotted trail (3-5 dots in path)
    'pulse'     -- concentric expanding rings
  ));
