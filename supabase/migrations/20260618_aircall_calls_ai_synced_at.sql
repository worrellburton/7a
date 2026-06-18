-- Marks when we last attempted to pull Aircall AI (Conversation
-- Intelligence) data for a call via the REST AI endpoints. Lets the AI
-- backfill skip calls it already tried — important because pre-AI-Assist
-- calls will never have AI data, and without this marker the backfill
-- would re-hit Aircall's four AI endpoints for them on every cron run and
-- exhaust the rate limit. Webhook-delivered AI still lands independently
-- (it writes summary / transcript directly and ignores this column).
alter table public.aircall_calls add column if not exists ai_synced_at timestamptz;
