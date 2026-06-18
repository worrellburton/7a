-- Rename the legacy CallTrackingMetrics page from /feather/calls to
-- /feather/ctm and reclaim /feather/calls for the new Aircall surface.
--
-- Nav is code-driven (src/lib/PagePermissions.tsx defaultPages); the
-- page_permissions table only stores per-path overrides (admin_only,
-- section, sort_order, departments, alumni_only) merged by path. We:
--   1. Move the existing CTM override row to the new /feather/ctm path
--      (preserving its unrestricted settings). `path` is unique, and no
--      /feather/ctm row exists yet, so a plain UPDATE is safe.
--   2. Register a fresh unrestricted row for the Aircall /feather/calls.
--   3. Repoint per-user overrides + activity-feed deep links so allow/
--      deny rules and links keep matching once the renamed code lands.

update public.page_permissions
set path = '/feather/ctm', updated_at = now()
where path = '/feather/calls';

insert into public.page_permissions (path, admin_only, section, sort_order, allowed_departments, department_id, alumni_only)
values ('/feather/calls', false, 'nav', 7, '{}', null, false)
on conflict (path) do nothing;

update public.user_page_permissions
set path = '/feather/ctm'
where path = '/feather/calls';

update public.activity_log
set target_path = '/feather/ctm' || substring(target_path from char_length('/feather/calls') + 1)
where target_path = '/feather/calls' or target_path like '/feather/calls/%';
