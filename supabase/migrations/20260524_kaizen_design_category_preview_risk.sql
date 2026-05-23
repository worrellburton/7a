-- Kaizen recommendations gain three new fields:
--
--   · 'design' category — for visual / UI-mockup recommendations
--     that come with a preview snippet (next column).
--   · design_preview_html — Claude returns a self-contained HTML
--     snippet (200-600 chars) for design-category rows so the
--     Kaizen page can render a sandboxed preview of what the
--     change looks like.
--   · risk_score (1-5) — estimate of how risky shipping this
--     change is to site stability. 1 = pure UI tweak, 5 = touches
--     auth/billing/send pipeline. Surfaces alongside priority so
--     the super admin can sort low-risk wins from high-risk
--     rewrites at a glance.

alter table public.kaizen_recommendations
  drop constraint if exists kaizen_recommendations_category_check;

alter table public.kaizen_recommendations
  add constraint kaizen_recommendations_category_check
  check (category in ('features','codebase','growth','ux','performance','design'));

alter table public.kaizen_recommendations
  add column if not exists design_preview_html text;

alter table public.kaizen_recommendations
  add column if not exists risk_score integer not null default 2
  check (risk_score between 1 and 5);

comment on column public.kaizen_recommendations.design_preview_html is
  'Optional self-contained HTML snippet (~200-600 chars) Claude renders when category=design so the dashboard can show a preview of what the proposed visual change looks like. Rendered inside a sandboxed iframe on the page.';
comment on column public.kaizen_recommendations.risk_score is
  '1-5 estimate of how risky shipping this change is to site stability. 1=safe (pure UI tweak, no data path touched), 2=low (additive feature, no migrations), 3=moderate (touches an API route or adds a migration), 4=high (schema change with backfill, RLS rewrite), 5=critical (auth flow, billing, send pipeline, payment).';
