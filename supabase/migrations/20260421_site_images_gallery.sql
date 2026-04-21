-- Tracking table for the marketing image gallery (`/app/images`).
-- Files live in the existing `public-images` bucket; this table holds the
-- metadata we want to show in the admin UI without listing storage every
-- request, plus per-user attribution for who uploaded each file.
CREATE TABLE IF NOT EXISTS public.site_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path        text NOT NULL UNIQUE,
  public_url  text NOT NULL,
  filename    text NOT NULL,
  mime        text,
  size        bigint,
  width       integer,
  height      integer,
  alt         text,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_images_created_at_idx
  ON public.site_images (created_at DESC);

ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

-- Any signed-in staff member can browse the gallery and add to it.
DROP POLICY IF EXISTS "site_images select for authenticated" ON public.site_images;
CREATE POLICY "site_images select for authenticated"
  ON public.site_images
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "site_images insert for authenticated" ON public.site_images;
CREATE POLICY "site_images insert for authenticated"
  ON public.site_images
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Updates (e.g. setting alt text) limited to the uploader or an admin.
DROP POLICY IF EXISTS "site_images update by uploader or admin" ON public.site_images;
CREATE POLICY "site_images update by uploader or admin"
  ON public.site_images
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );

-- Deletes limited to the uploader or an admin.
DROP POLICY IF EXISTS "site_images delete by uploader or admin" ON public.site_images;
CREATE POLICY "site_images delete by uploader or admin"
  ON public.site_images
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );
