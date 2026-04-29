-- Cache for the experiential-therapy outings catalog. The Holistic
-- & Indigenous public page renders a card per off-site outing
-- (Chiricahua, Bisbee, Tombstone, etc.) and a Gemini image-gen run
-- creates a photo-real illustration for each. We cache the result
-- URL keyed by slug; regenerating the image is a no-op as long as
-- the source prompt hasn't changed.

create table if not exists public.outings_images (
  slug text primary key,
  image_url text not null,
  source_prompt text not null,
  model text,
  generated_at timestamptz not null default now()
);

alter table public.outings_images enable row level security;

-- Public read so the marketing page (no auth) can render the cached
-- URLs without going through an authenticated proxy.
drop policy if exists outings_images_select_public on public.outings_images;
create policy outings_images_select_public
  on public.outings_images
  for select
  using (true);

-- Writes happen via service-role client in /api/outings/preheat,
-- so no INSERT/UPDATE policy is needed for end-user roles.
