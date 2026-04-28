-- VOB submissions get up to three follow-up attempts, each with
-- its own responder + timestamp + note. Stored as a JSONB array so
-- the schema can extend to 4+ later without another migration.
-- Each entry shape:
--   { at: ISO8601, by: uuid, by_name: text, by_avatar_url: text|null,
--     note: text|null }
--
-- The legacy responded_at / responded_by / responded_note columns
-- stay put. The respond API now mirrors attempts[0] into them on
-- every save so dashboard counts, unread badges, and any external
-- query that still reads the singular columns keep working.

alter table public.vob_requests
  add column if not exists attempts jsonb not null default '[]'::jsonb,
  add column if not exists admin_notes text;

-- Backfill attempts[0] from any existing single-response rows so the
-- new UI shows historical data in the 1st-attempt slot. We synthesize
-- by_name/by_avatar_url as null because the old schema only stored
-- the user id; the UI's resolver will look them up by id.

update public.vob_requests
set attempts = jsonb_build_array(jsonb_build_object(
  'at', to_char(responded_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'by', responded_by,
  'by_name', null,
  'by_avatar_url', null,
  'note', responded_note
))
where attempts = '[]'::jsonb
  and responded_at is not null;
