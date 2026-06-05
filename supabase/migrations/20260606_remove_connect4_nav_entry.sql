-- The Connect-4 tournament has a home in the Arcade now
-- (/app/arcade/connect-four), so the standalone /app/games/connect4
-- nav link is redundant. Delete the row so the sidebar stops
-- rendering it; the route itself still works (PageGuard treats
-- unregistered paths as open).
DELETE FROM page_permissions WHERE path = '/app/games/connect4';
