-- Optional "feature a horse" pointer on email_campaigns. The
-- builder UI gets a third feature row (alongside Featured Blog +
-- Featured Employee). The build / draft-text APIs read the horse's
-- name, photo (equine.image_url), and notes so Claude weaves it
-- into the email body and renders a small Meet-the-Herd card.

alter table public.email_campaigns
  add column if not exists featured_equine_id uuid references public.equine(id) on delete set null;
