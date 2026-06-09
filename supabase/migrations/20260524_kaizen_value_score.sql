
alter table public.kaizen_recommendations
  add column if not exists value_score integer not null default 3
  check (value_score between 1 and 5);

comment on column public.kaizen_recommendations.value_score is
  '1-5 estimate of how much business value shipping this change will deliver. 5 = step-change, 4 = high, 3 = solid, 2 = nice-to-have, 1 = mostly cosmetic. Independent of priority + risk so the dashboard can show value-per-risk on each row.';

