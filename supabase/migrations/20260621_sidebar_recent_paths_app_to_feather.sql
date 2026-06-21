-- The app's route prefix migrated from /app to /feather, but stored
-- sidebar recency paths (users.sidebar_recent_paths) still used /app —
-- so they no longer matched the /feather nav and the sidebar fell back
-- to alphabetical order on every refresh. (The /api/sidebar/visit route
-- also still validated against /app, silently 400-ing every new visit,
-- so nothing fresh was being saved either; that's fixed in code.)
--
-- Rewrite the prefix in place so each user's click order carries over.
update public.users
set sidebar_recent_paths = (
  select array_agg(
    case
      when p = '/app' then '/feather'
      when p like '/app/%' then '/feather/' || substring(p from 6)
      else p
    end
    order by ord
  )
  from unnest(sidebar_recent_paths) with ordinality as t(p, ord)
)
where sidebar_recent_paths is not null
  and array_length(sidebar_recent_paths, 1) > 0
  and exists (select 1 from unnest(sidebar_recent_paths) as p where p = '/app' or p like '/app/%');
