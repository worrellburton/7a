-- Singleton app_settings row for global feature flags / levers.
-- Add new columns here when introducing new toggles.
--
-- ai_call_scoring_enabled: master lever for the AI side of calls.
--   When false, /api/ctm/webhook still ingests calls into public.calls
--   but does NOT mark needs_score=true, /api/calls/auto-score is a
--   no-op, and /api/claude/calls/score refuses to run. CTM data
--   continues to flow; AI analysis is paused.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  ai_call_scoring_enabled boolean NOT NULL DEFAULT true,
  ai_call_scoring_updated_at timestamptz,
  ai_call_scoring_updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.app_settings (id, ai_call_scoring_enabled)
VALUES (true, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_authed ON public.app_settings;
CREATE POLICY app_settings_select_authed
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS app_settings_update_admin ON public.app_settings;
CREATE POLICY app_settings_update_admin
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true)
  );
