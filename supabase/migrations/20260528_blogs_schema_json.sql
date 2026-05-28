alter table public.blogs
  add column if not exists schema_json jsonb,
  add column if not exists schema_generated_at timestamptz;
