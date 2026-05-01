-- Add a date-of-birth column to vob_requests so the AdmissionsForm
-- can capture DOB up-front. Required by every payer's eligibility
-- API, so capturing it on the form removes a round-trip with the
-- prospect. Nullable so historic rows (and future submissions where
-- the prospect skips the field) still insert cleanly.

alter table public.vob_requests
  add column if not exists date_of_birth date;
