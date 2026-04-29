-- "hidden" lets a teammate dismiss a curated directory from the
-- table without hard-deleting from the hardcoded DIRECTORIES list.
-- Custom directories still hard-delete (seo_custom_directories);
-- this column only matters for curated rows where deletion isn't
-- possible at the data layer.

alter table public.directory_states
  add column if not exists hidden boolean not null default false;

alter table public.directory_states
  add column if not exists hidden_set_by uuid references public.users(id);

alter table public.directory_states
  add column if not exists hidden_set_at timestamptz;
