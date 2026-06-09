-- Manual placement log for off-site backlinks (Forum, PDF, Web 2.0,
-- Social Bookmarks). Replaces the OutreachContent table on the Forum
-- tab — instead of an outreach/approval workflow, the team logs each
-- placed link with Website / Target URL / Anchor Text / Live Link.
--
-- channel CHECK keeps the four supported types tight; adding a fifth
-- means updating the constraint and the LinksSubNav at the same time.
--
-- RLS mirrors seo_outreach_entries (admin OR Marketing dept member)
-- so a marketer who can see /app/seo can also add placements without
-- bouncing off a 403.

CREATE TABLE IF NOT EXISTS public.seo_backlink_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('forum', 'pdf', 'web2_0', 'social_bookmark')),
  website text,
  target_url text,
  anchor_text text,
  live_link text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_backlink_placements_channel_idx
  ON public.seo_backlink_placements (channel, created_at DESC);

ALTER TABLE public.seo_backlink_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_backlink_placements_select ON public.seo_backlink_placements;
CREATE POLICY seo_backlink_placements_select
  ON public.seo_backlink_placements
  FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

DROP POLICY IF EXISTS seo_backlink_placements_insert ON public.seo_backlink_placements;
CREATE POLICY seo_backlink_placements_insert
  ON public.seo_backlink_placements
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

DROP POLICY IF EXISTS seo_backlink_placements_update ON public.seo_backlink_placements;
CREATE POLICY seo_backlink_placements_update
  ON public.seo_backlink_placements
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

DROP POLICY IF EXISTS seo_backlink_placements_delete ON public.seo_backlink_placements;
CREATE POLICY seo_backlink_placements_delete
  ON public.seo_backlink_placements
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.department_id = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9'::uuid
    )
  );

COMMENT ON TABLE public.seo_backlink_placements IS
  'Manual placement log for backlinks built off-site (Forum, PDF, Web 2.0, Social Bookmarks). Each row is one published link, tracked with Website / Target URL / Anchor Text / Live Link columns.';
