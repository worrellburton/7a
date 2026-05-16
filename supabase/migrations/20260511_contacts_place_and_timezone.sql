-- Location autocomplete + auto-derived timezone for the /app/outreach
-- contact rows. When an admin picks a place from the Google Places
-- autocomplete dropdown, we save:
--   place_id          — Google's stable place identifier, so we can
--                       re-resolve / re-render markers later
--   formatted_address — the canonical "City, State, USA" string Google
--                       returns (replaces the freeform location field
--                       for new entries; old free-text entries keep
--                       living in `location` as before)
--   lat / lng         — already exist from the geocode-columns migration
--                       earlier today; the autocomplete flow fills them
--                       in synchronously so no backfill is needed
--   tz                — IANA timezone id (e.g. "America/Phoenix").
--                       Drives the local-time label next to the phone
--                       icon in the grid hover popover.

alter table public.contacts
  add column if not exists tz text,
  add column if not exists place_id text,
  add column if not exists formatted_address text;
