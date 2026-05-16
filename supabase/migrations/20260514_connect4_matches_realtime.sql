-- Connect-4 tournament · Phase 4 · realtime enablement
--
-- Add the matches table to the supabase_realtime publication so
-- the client can subscribe to per-match changes (filter on id) and
-- pick up new moves from the other player without polling.

alter publication supabase_realtime add table public.connect4_matches;
