-- Tag each calendar_events row with the schedule it belongs to. The
-- new "Phones" tab on /app/calendar lives next to Groups / Team /
-- Events; user-subject events scheduled while Phones is active get
-- category='phones', everything else stays 'team'. The Team tab
-- filters to category='team', the Phones tab filters to 'phones'.
-- Group / standalone events ignore the category — the
-- subject_kind discriminator already keeps them in their own tabs.
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'team';

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_category_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_category_check
  CHECK (category IN ('team', 'phones'));

CREATE INDEX IF NOT EXISTS calendar_events_category_idx
  ON public.calendar_events (category);
