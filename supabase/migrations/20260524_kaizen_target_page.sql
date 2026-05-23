-- Each kaizen_recommendation now carries metadata about what page
-- the change lands on:
--   target_kind   = 'existing' | 'new' | 'global'
--   target_path   = route path (e.g. /admissions, /app/.../leads/[id])
--   target_label  = optional human-friendly label
-- So the Kaizen dashboard can surface "this is a change to an
-- existing page → here's the page" vs "this is a brand-new
-- surface".

alter table public.kaizen_recommendations
  add column if not exists target_kind text
    check (target_kind in ('existing','new','global')),
  add column if not exists target_path text,
  add column if not exists target_label text;

comment on column public.kaizen_recommendations.target_kind is
  'Where the change lands: existing = modifies a page that already exists, new = introduces a brand-new page/surface, global = a cross-cutting change with no single page (e.g. shared header, build config).';
comment on column public.kaizen_recommendations.target_path is
  'Route path or file path of the page the change targets, e.g. /admissions or /app/admissions/leads/[id]. Empty when target_kind=global.';
comment on column public.kaizen_recommendations.target_label is
  'Human-friendly label for the target — Claude infers from the brief (e.g. "Lead detail header", "Home hero"). Optional.';
