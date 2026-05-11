-- public.users.last_outreach_seen_at — timestamp of the LAST time
-- this user visited /app/outreach. Used by the outreach grid to
-- highlight any contact whose updated_at is newer than this stamp,
-- so admissions can see at a glance what changed since they were
-- last looking.
--
-- Distinct from users.last_seen_at (general presence / online
-- status) — that's heartbeat'd while the user is anywhere in the
-- app and would never let us identify "new since I was on this
-- specific page" cleanly.
--
-- Captured at page-mount time and persisted on unload, so the
-- highlight survives the rest of the current session and clears
-- on the next visit.

alter table public.users
  add column if not exists last_outreach_seen_at timestamptz;
