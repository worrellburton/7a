-- Geocoded coordinates for the /app/outreach map view.
--
-- contacts.location is freeform text ("Phoenix, AZ", "Boulder",
-- sometimes empty). To drop pins on a map we need lat / lng. The
-- backfill is asynchronous — when an admin loads the map view, the
-- frontend hits POST /api/outreach/geocode which walks every row
-- whose location is non-null and geocoded_at is null and runs
-- Google's Geocoding API server-side using GOOGLE_PLACES_API_KEY
-- (same Google Cloud project as the existing Places integration;
-- Geocoding API must be enabled on the project).
--
-- geocode_source records which provider returned the coords so we
-- can re-geocode selectively if we ever switch geocoders or hit a
-- known-bad batch. Partial index lets the "list pins" query skip
-- the un-geocoded majority cheaply.

alter table public.contacts
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_source text;

create index if not exists contacts_lat_lng_idx
  on public.contacts(lat, lng)
  where lat is not null and lng is not null;
