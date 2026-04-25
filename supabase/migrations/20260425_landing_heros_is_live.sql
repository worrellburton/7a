-- Mark exactly one hero as the live one. The public landing page
-- reads the live row's video_ids and plays them as the hero
-- carousel. If no row is live (e.g. deleted) the public site falls
-- back to the lowest display_order.
alter table public.landing_heros
  add column if not exists is_live boolean not null default false;

-- Partial unique index: at most one row can have is_live = true.
create unique index if not exists landing_heros_only_one_live
  on public.landing_heros ((is_live)) where is_live;

-- Seed: if no row is live yet, mark the first by display_order.
update public.landing_heros
set is_live = true
where id = (
  select id from public.landing_heros order by display_order, created_at limit 1
)
and not exists (
  select 1 from public.landing_heros where is_live = true
);

comment on column public.landing_heros.is_live is
  'Exactly-zero-or-one row is marked live (partial unique index). The public landing page renders this row''s video_ids; otherwise falls back to the lowest display_order.';
