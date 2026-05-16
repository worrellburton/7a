-- vob_requests: fields needed to send Stedi 270 eligibility requests
-- and to remember what Claude vision read off the insurance card.
--
-- subscriber_* mirror the patient when relationship='self'; otherwise
-- they identify a different policyholder (spouse, parent, etc.).
-- payer_id is the Stedi/CMS payer identifier (e.g. 'BCBSAZ', '60054').
-- card_ocr stores the raw structured extraction so we can re-run /
-- audit without re-hitting Claude.
-- eligibility_response stores the latest 271 reply.

alter table public.vob_requests
  add column if not exists member_id text,
  add column if not exists group_number text,
  add column if not exists payer_id text,
  add column if not exists payer_name text,
  add column if not exists subscriber_relationship text,
  add column if not exists subscriber_first_name text,
  add column if not exists subscriber_last_name text,
  add column if not exists subscriber_dob date,
  add column if not exists card_ocr jsonb,
  add column if not exists card_ocr_at timestamptz,
  add column if not exists eligibility_response jsonb,
  add column if not exists eligibility_checked_at timestamptz,
  add column if not exists eligibility_checked_by uuid;
