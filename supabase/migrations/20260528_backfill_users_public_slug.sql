-- The /api/blog-authors response filters out users without
-- public_slug, which means the Byline picker on /app/content/[id]
-- has been falling back to the 2-person BLOG_AUTHORS seed instead
-- of surfacing the 37-strong team roster. Backfill a slug for any
-- active team member missing one, derived from full_name. Collisions
-- get a -2 / -3 suffix via row_number().

with slugged as (
  select
    id,
    created_at,
    nullif(trim(both '-' from regexp_replace(lower(coalesce(full_name, '')), '[^a-z0-9]+', '-', 'g')), '') as base_slug
  from public.users
  where status = 'active'
    and (user_kind is null or user_kind != 'alumni')
    and full_name is not null
    and public_slug is null
),
existing as (
  select public_slug as slug from public.users where public_slug is not null
),
candidates as (
  select
    id,
    base_slug,
    row_number() over (
      partition by base_slug
      order by created_at, id
    ) as rn
  from slugged
  where base_slug is not null
),
final as (
  select
    id,
    case when rn = 1 then base_slug else base_slug || '-' || rn::text end as candidate_slug
  from candidates
)
update public.users u
set public_slug = f.candidate_slug
from final f
where u.id = f.id
  and not exists (select 1 from existing e where e.slug = f.candidate_slug);

-- Anyone still null (collided with an existing public_slug) gets a
-- short id-tail suffix so they're still selectable. Edge case;
-- usually nobody lands here.
update public.users u
set public_slug = (
  nullif(trim(both '-' from regexp_replace(lower(coalesce(full_name, '')), '[^a-z0-9]+', '-', 'g')), '')
  || '-' || substr(replace(id::text, '-', ''), 1, 6)
)
where u.status = 'active'
  and (u.user_kind is null or u.user_kind != 'alumni')
  and u.full_name is not null
  and u.public_slug is null;
