-- Per-directory screenshot uploads. The team drops images on a row
-- (proof a listing was submitted, intake confirmation email, the
-- deployed listing page) and they live attached to that
-- directory_id. storage_path lives under public-images bucket so
-- thumbnails render without auth round-trips.
CREATE TABLE IF NOT EXISTS public.seo_directory_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_id text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  content_type text,
  size_bytes integer,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_by_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_directory_screenshots_directory_idx
  ON public.seo_directory_screenshots (directory_id, uploaded_at DESC);

ALTER TABLE public.seo_directory_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_directory_screenshots_select_authed
  ON public.seo_directory_screenshots;
CREATE POLICY seo_directory_screenshots_select_authed
  ON public.seo_directory_screenshots
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS seo_directory_screenshots_delete
  ON public.seo_directory_screenshots;
CREATE POLICY seo_directory_screenshots_delete
  ON public.seo_directory_screenshots
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_directory_screenshots;
