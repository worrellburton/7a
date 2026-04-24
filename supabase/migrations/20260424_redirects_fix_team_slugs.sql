-- Fix stale to_paths on existing team-member redirects.
--
-- The original seed (20260424_redirects_seed.sql) pre-dated a
-- check against the live `/who-we-are/meet-our-team` grid and
-- pointed three /about-us/* inbound URLs at destinations that
-- 404 on the new site. The old seed is safe to re-run
-- (on conflict do nothing) but won't repair existing rows — this
-- migration issues explicit updates.
--
-- Verified against the live team grid on 2026-04-24:
--   * Brian TwoMoons is listed as `brian-twomoons` (no hyphen).
--   * Tracey Oppenheim is listed as `tracey-oppenheim` (no title prefix).
--   * Laura Harder is no longer on the team — fall back to the index.

update public.redirects
   set to_path = '/who-we-are/meet-our-team/brian-twomoons',
       notes  = 'New-site slug collapses "twomoons"'
 where from_path = '/about-us/brian-two-moons/';

update public.redirects
   set to_path = '/who-we-are/meet-our-team/tracey-oppenheim',
       notes  = 'New-site slug drops dr/md title'
 where from_path = '/about-us/dr-tracey-oppenheim-md/';

update public.redirects
   set to_path = '/who-we-are/meet-our-team',
       notes  = 'Laura no longer on team'
 where from_path = '/about-us/laura-harder-lac-ma/';
