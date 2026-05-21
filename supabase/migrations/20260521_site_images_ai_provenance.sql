-- AI-image provenance on public.site_images so the /app/images
-- grid can split into Real / AI tabs, and an editor saving a
-- blog selection that includes AI-generated images can promote
-- those images into the shared library without leaving the
-- gallery duplicated or unsorted.
--
-- All five columns are nullable / defaulted false. Existing rows
-- (uploads via /app/images drag-drop, kaizen, etc.) implicitly
-- become 'Real' since is_ai stays false.

alter table public.site_images
  add column if not exists is_ai boolean not null default false,
  add column if not exists ai_provider text,
  add column if not exists ai_prompt text,
  add column if not exists source_blog_id uuid references public.blogs(id) on delete set null,
  add column if not exists source_blog_image_id uuid references public.blog_images(id) on delete set null;

-- Unique on source_blog_image_id so the 'save selection on a blog
-- with AI images → copy to library' hook is idempotent: re-saving
-- the same selection is a no-op, never a second site_images row.
create unique index if not exists site_images_source_blog_image_id_uniq
  on public.site_images(source_blog_image_id)
  where source_blog_image_id is not null;

-- Partial index for the AI tab's filtered list query (is_ai=true
-- ordered by created_at desc). Kept tiny — only AI rows hit it.
create index if not exists site_images_ai_recent_idx
  on public.site_images(created_at desc)
  where is_ai = true;
