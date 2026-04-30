-- Manually-entered backlinks. Stored separately from the
-- seo_backlinks_snapshots table (which holds the most-recent
-- Semrush sync as a single JSONB payload) so that adding a manual
-- row doesn't fight the next Semrush sync — the page reads from
-- both sources and merges them at display time.
CREATE TABLE IF NOT EXISTS public.seo_manual_backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL,
  source_url text NOT NULL,
  source_title text,
  anchor text,
  target_url text,
  is_follow boolean NOT NULL DEFAULT true,
  is_nofollow boolean NOT NULL DEFAULT false,
  is_ugc boolean NOT NULL DEFAULT false,
  is_sponsored boolean NOT NULL DEFAULT false,
  page_score integer,
  notes text,
  added_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_manual_backlinks_target_idx
  ON public.seo_manual_backlinks (target, created_at DESC);

ALTER TABLE public.seo_manual_backlinks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_manual_backlinks_select_authed
  ON public.seo_manual_backlinks;
CREATE POLICY seo_manual_backlinks_select_authed
  ON public.seo_manual_backlinks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS seo_manual_backlinks_delete
  ON public.seo_manual_backlinks;
CREATE POLICY seo_manual_backlinks_delete
  ON public.seo_manual_backlinks
  FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_manual_backlinks;
