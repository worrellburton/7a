-- Per-recipient row when a super admin pulls a "lever" — the
-- broadcast pattern that drives the /app/levers page. Writing one
-- row per (lever_type, target_user_id) lets each recipient's
-- realtime subscription fire only for their own user_id without
-- needing a broadcast channel. Status flips to 'dismissed' or
-- 'completed' when the popup is acknowledged.
CREATE TABLE IF NOT EXISTS public.lever_pulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lever_type text NOT NULL,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pulled_by uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  pulled_by_name text,
  pulled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'completed')),
  acknowledged_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lever_pulls_target_user_idx
  ON public.lever_pulls (target_user_id, status, pulled_at DESC);

CREATE INDEX IF NOT EXISTS lever_pulls_type_pulled_at_idx
  ON public.lever_pulls (lever_type, pulled_at DESC);

ALTER TABLE public.lever_pulls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lever_pulls_select_self ON public.lever_pulls;
CREATE POLICY lever_pulls_select_self
  ON public.lever_pulls
  FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );

DROP POLICY IF EXISTS lever_pulls_update_self ON public.lever_pulls;
CREATE POLICY lever_pulls_update_self
  ON public.lever_pulls
  FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.lever_pulls;
