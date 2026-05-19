-- Extend the seo_outreach_entries.channel CHECK to include
-- 'brand_profile'. The page (Backlinks → Brand profiles) tracks
-- brand-page placements (G2, Capterra, Crunchbase, etc.) the same
-- way press releases, guest posts, comments, and forums are tracked.
ALTER TABLE public.seo_outreach_entries
  DROP CONSTRAINT IF EXISTS seo_outreach_entries_channel_check;

ALTER TABLE public.seo_outreach_entries
  ADD CONSTRAINT seo_outreach_entries_channel_check
  CHECK (channel IN ('press_release', 'guest_post', 'comment', 'forum', 'brand_profile'));
