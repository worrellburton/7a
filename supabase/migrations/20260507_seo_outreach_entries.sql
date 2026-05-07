-- Outreach trackers for the four new "Backlinks" sub-pages —
-- Press releases, Guest posts, Comments, and Forums. Every row is
-- one outreach prospect (a target URL we're pitching, commenting on,
-- or have placed a link in) and carries its own per-row chat thread
-- in seo_outreach_messages so the team can talk through each one
-- without leaving the page.
--
-- All four sub-pages share a single table — `channel` discriminates
-- which sub-page the row belongs to. Press releases and guest posts
-- usually represent a piece of content we placed; comments and
-- forums represent existing threads we're contributing into.

CREATE TABLE IF NOT EXISTS public.seo_outreach_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('press_release', 'guest_post', 'comment', 'forum')),
  url text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'published', 'declined')),
  notes text,
  added_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_outreach_entries_channel_created_idx
  ON public.seo_outreach_entries (channel, created_at DESC);

ALTER TABLE public.seo_outreach_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_outreach_entries_select_admin ON public.seo_outreach_entries;
CREATE POLICY seo_outreach_entries_select_admin
  ON public.seo_outreach_entries
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS seo_outreach_entries_insert_admin ON public.seo_outreach_entries;
CREATE POLICY seo_outreach_entries_insert_admin
  ON public.seo_outreach_entries
  FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS seo_outreach_entries_update_admin ON public.seo_outreach_entries;
CREATE POLICY seo_outreach_entries_update_admin
  ON public.seo_outreach_entries
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS seo_outreach_entries_delete_admin ON public.seo_outreach_entries;
CREATE POLICY seo_outreach_entries_delete_admin
  ON public.seo_outreach_entries
  FOR DELETE
  USING (is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'seo_outreach_entries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_outreach_entries';
  END IF;
END $$;

-- Per-entry chat thread, mirroring seo_backlink_messages /
-- facilities_issue_messages. Cascades on entry delete so threads
-- never outlive their parent.
CREATE TABLE IF NOT EXISTS public.seo_outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.seo_outreach_entries(id) ON DELETE CASCADE,
  body text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_outreach_messages_entry_idx
  ON public.seo_outreach_messages (entry_id, created_at);

ALTER TABLE public.seo_outreach_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_outreach_messages_select_admin ON public.seo_outreach_messages;
CREATE POLICY seo_outreach_messages_select_admin
  ON public.seo_outreach_messages
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS seo_outreach_messages_insert_admin ON public.seo_outreach_messages;
CREATE POLICY seo_outreach_messages_insert_admin
  ON public.seo_outreach_messages
  FOR INSERT
  WITH CHECK (is_admin() AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS seo_outreach_messages_delete_own ON public.seo_outreach_messages;
CREATE POLICY seo_outreach_messages_delete_own
  ON public.seo_outreach_messages
  FOR DELETE
  USING (is_admin() AND user_id = (SELECT auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'seo_outreach_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_outreach_messages';
  END IF;
END $$;
