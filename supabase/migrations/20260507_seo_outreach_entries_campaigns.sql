-- Press-release campaigns. A campaign carries the full release body
-- inline (so the team can compose + review it without bouncing to a
-- doc) and starts life pending superadmin approval. Once approved it
-- moves into the regular outreach status flow (in_progress, published,
-- declined). Single-URL placements (the original use of this table)
-- still work — they just have is_campaign=false and skip the approval
-- gate.

ALTER TABLE public.seo_outreach_entries
  ADD COLUMN IF NOT EXISTS body text;

ALTER TABLE public.seo_outreach_entries
  ADD COLUMN IF NOT EXISTS is_campaign boolean NOT NULL DEFAULT false;

ALTER TABLE public.seo_outreach_entries
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.seo_outreach_entries
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- URL is required for placement rows but optional for campaign drafts
-- (we don't have a wire URL until after distribution).
ALTER TABLE public.seo_outreach_entries
  ALTER COLUMN url DROP NOT NULL;

-- Expand the status check to include pending_approval.
ALTER TABLE public.seo_outreach_entries
  DROP CONSTRAINT IF EXISTS seo_outreach_entries_status_check;

ALTER TABLE public.seo_outreach_entries
  ADD CONSTRAINT seo_outreach_entries_status_check
  CHECK (status IN ('not_started', 'pending_approval', 'in_progress', 'published', 'declined'));
