-- Perf pass: indexes backing the home orbit + contacts list queries.
-- Applied via MCP on 2026-06-10; committed here for reproducibility.

-- Home orbit filters users by "signed in since midnight" and sorts
-- by the same column; previously a seq scan over the whole table.
CREATE INDEX IF NOT EXISTS users_last_sign_in_idx
  ON public.users (last_sign_in DESC NULLS LAST);

-- Home orbit pulls today's activity rows scoped to the on-screen
-- user ids. The existing single-column indexes force a bitmap-AND;
-- the composite serves the filter + order in one pass.
CREATE INDEX IF NOT EXISTS activity_log_user_created_idx
  ON public.activity_log (user_id, created_at DESC);

-- /api/contacts orders every list response by last_contact_at desc
-- nulls last, then name. No index covered that, so each request
-- sorted the full table.
CREATE INDEX IF NOT EXISTS contacts_last_contact_at_name_idx
  ON public.contacts (last_contact_at DESC NULLS LAST, name);
