-- Register the new staff-facing /app/alumni-roster page in the
-- permissions table so the sidebar + /app/admin/pages editor can see
-- it. admin_only=true keeps it out of non-staff sidebars; PageGuard
-- + PlatformShell.canSeePage extend visibility to is_alumni_admin
-- users via lib/alumni-admin-paths.ts.
INSERT INTO page_permissions (path, admin_only, alumni_only, section, sort_order, allowed_departments)
VALUES ('/app/alumni-roster', true, false, 'nav', 28, '{}'::uuid[])
ON CONFLICT (path) DO UPDATE
  SET admin_only = EXCLUDED.admin_only,
      alumni_only = EXCLUDED.alumni_only,
      section = EXCLUDED.section,
      sort_order = EXCLUDED.sort_order;
