-- Singleton has been superseded by the multi-row landing_heros
-- table. Backfill ran in 20260425_landing_heros_multi.sql so no
-- data is lost; the legacy /api/landing/hero route was removed in
-- the same change set.
drop table if exists public.landing_hero_timeline cascade;
drop function if exists public.touch_landing_hero_timeline() cascade;
