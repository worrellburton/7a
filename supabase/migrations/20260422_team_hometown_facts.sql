-- Additional public-team profile fields so team members can share a
-- hometown and a short list of lightweight "interesting facts" on
-- /who-we-are/meet-our-team/<slug>.
--
-- `interesting_facts` is a JSONB array of { prompt, answer } objects so
-- members can pick from a curated prompt list (easier than staring at a
-- blank box) while keeping the shape flexible if we add prompts later.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS interesting_facts jsonb NOT NULL DEFAULT '[]'::jsonb;
