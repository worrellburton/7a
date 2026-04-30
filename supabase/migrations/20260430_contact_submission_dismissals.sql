-- Per-user dismissal of an individual contact_submissions row.
-- The notification toast remains on screen for every member of
-- the audience (super admins + marketing/admissions dept) until
-- they dismiss it. Inserting a dismissal row flips the toast off
-- for that user; nothing on the underlying submission changes.
CREATE TABLE IF NOT EXISTS public.contact_submission_dismissals (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, submission_id)
);

ALTER TABLE public.contact_submission_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_submission_dismissals_select_self
  ON public.contact_submission_dismissals;
CREATE POLICY contact_submission_dismissals_select_self
  ON public.contact_submission_dismissals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS contact_submission_dismissals_insert_self
  ON public.contact_submission_dismissals;
CREATE POLICY contact_submission_dismissals_insert_self
  ON public.contact_submission_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime
  ADD TABLE public.contact_submission_dismissals;

-- contact_submissions itself joins the publication so the toast
-- can pop on INSERT.
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.contact_submissions;
