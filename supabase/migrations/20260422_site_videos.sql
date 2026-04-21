-- Video generations kicked off from /app/video.
-- We enqueue jobs on fal.ai's queue API (Seedance image-to-video) and
-- poll their /status endpoint; this table keeps the local bookkeeping so
-- the page can render a list of jobs + results across refreshes without
-- re-asking fal.ai for everything.
CREATE TABLE IF NOT EXISTS public.site_videos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Link back to the source image (may be NULL if the image was later
  -- deleted — we still want to keep the generated clip).
  source_image_id   uuid REFERENCES public.site_images(id) ON DELETE SET NULL,
  -- fal.ai queue identifiers so we can poll / re-fetch.
  request_id        text,
  model_endpoint    text NOT NULL,
  prompt            text,
  duration_seconds  integer,
  resolution        text,
  aspect_ratio      text,
  -- Completed output
  video_url         text,
  thumbnail_url     text,
  status            text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'canceled')),
  error             text,
  seed              bigint,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS site_videos_created_at_idx
  ON public.site_videos (created_at DESC);

CREATE INDEX IF NOT EXISTS site_videos_status_idx
  ON public.site_videos (status);

ALTER TABLE public.site_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_videos select for authenticated" ON public.site_videos;
CREATE POLICY "site_videos select for authenticated"
  ON public.site_videos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "site_videos insert for authenticated" ON public.site_videos;
CREATE POLICY "site_videos insert for authenticated"
  ON public.site_videos
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "site_videos update by creator or admin" ON public.site_videos;
CREATE POLICY "site_videos update by creator or admin"
  ON public.site_videos
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );

DROP POLICY IF EXISTS "site_videos delete by creator or admin" ON public.site_videos;
CREATE POLICY "site_videos delete by creator or admin"
  ON public.site_videos
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );
