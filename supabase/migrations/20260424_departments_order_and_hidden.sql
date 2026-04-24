-- Admin-controllable ordering + visibility for department groups in
-- the /app sidebar. Used by /app/pages to let admins drag the
-- department headers into the order they want and hide whole
-- departments (which also hides all of that department's pages from
-- the sidebar). Both columns are optional — nulls sort to the end in
-- the PlatformShell load, and existing departments keep their
-- current alphabetical order until an admin reorders them.
alter table public.departments
  add column if not exists display_order integer,
  add column if not exists hidden boolean not null default false;

create index if not exists departments_display_order_idx on public.departments (display_order);
create index if not exists departments_hidden_idx on public.departments (hidden);
