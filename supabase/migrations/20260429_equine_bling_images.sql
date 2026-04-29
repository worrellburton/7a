-- Cache for the "bling mode" image transform — toggling on the equine
-- roster sends each horse's photo through Gemini's nano-banana model
-- ("give all these horses bling and sunglasses") and stores the
-- result here so subsequent loads don't re-bill the API. Keyed by
-- horse_id + the source image URL: if the source photo changes, the
-- cache row's source_image_url no longer matches and the API regenerates.

create table if not exists public.equine_bling_images (
  horse_id uuid primary key references public.equine(id) on delete cascade,
  source_image_url text not null,
  bling_image_url text not null,
  generated_at timestamptz not null default now()
);

alter table public.equine_bling_images enable row level security;

drop policy if exists equine_bling_images_select_authenticated on public.equine_bling_images;
create policy equine_bling_images_select_authenticated
  on public.equine_bling_images
  for select
  using (auth.uid() is not null);

-- Writes happen via service-role client in /api/equine/bling, so no
-- INSERT/UPDATE policy is needed for end-user roles.
