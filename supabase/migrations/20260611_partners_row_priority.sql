-- Manual priority ranking for partners WITHIN each type sheet.
-- 1 = our best partner of that type. The grid sorts by this and lets
-- users nudge rows up/down; partners is already in the realtime
-- publication, so a reorder propagates to every open tab.
alter table public.partners
  add column if not exists priority integer;

-- Backfill: number existing rows 1..N per type following the current
-- display order (specialty alpha, then name) so nothing visibly moves
-- when the feature lands.
with ranked as (
  select id,
         row_number() over (
           partition by type
           order by lower(coalesce(specialty, '~~')), lower(name)
         ) as rn
  from public.partners
)
update public.partners p
set priority = ranked.rn
from ranked
where ranked.id = p.id
  and p.priority is null;
