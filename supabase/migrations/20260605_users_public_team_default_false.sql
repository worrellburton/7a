-- New users should NOT appear on the public Meet Our Team page by
-- default — the marketing site reads
-- users where status='active' AND public_team=true, so flipping
-- the column default from true to false makes a freshly-signed-up
-- teammate invisible to the public until they (via /app/profile)
-- or an admin (via the Team Page Order modal) explicitly opts them in.
--
-- Existing rows are left as-is: this only affects future INSERTs.
-- Profile + admin code already treats NULL/false as "hidden" and
-- writes a real boolean on save, so legacy true rows keep showing
-- and legacy false rows stay hidden without any backfill work.
alter table public.users
  alter column public_team set default false;
