-- Pair the featured page with a specific picture so the marketer
-- can lock in which image accompanies the page card in the email.
-- Without this column, the page picker only saved a path and the
-- email builder had to guess (or skip) an image for the "Continue
-- exploring" block.
alter table public.email_campaigns
  add column if not exists featured_page_image_url text;

comment on column public.email_campaigns.featured_page_image_url is
  'URL of the picture that pairs with featured_page_path in the email body. Picked in the second step of the Feature-a-page modal; must be one of the marketer''s library image URLs.';
