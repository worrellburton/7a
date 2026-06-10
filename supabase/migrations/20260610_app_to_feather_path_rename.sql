-- Rebrand: the internal surface moved from /app/* to /feather/*.
-- next.config.mjs adds a permanent 308 redirect /app/:path* → /feather/:path*
-- so external links keep working, but every row that stores the old
-- prefix in the database needs to be rewritten so PagePermissions,
-- activity-feed deep links, and kaizen target paths point at the new
-- routes.
--
-- Tables touched (counts at migration time):
--   page_permissions.path           — 72 rows  (PK; no inbound FKs)
--   user_page_permissions.path      — 85 rows  (composite PK; no inbound FKs)
--   activity_log.target_path        — 3,985 rows
--   kaizen_recommendations.target_path — 86 rows
--   users.last_path                 — 54 rows (presence)
--
-- Tables intentionally NOT touched:
--   redirects.to_path               — 0 hits
--   email_campaigns.featured_page_path — 0 hits
--   feature_requests.page_path      — 0 hits
--   permission_group_pages          — 0 hits
--   storage-path columns (contact_logs.transcript_storage_path,
--   jd_signatures.pdf_storage_path, seo_directory_screenshots.storage_path,
--   site_images.path, vob_requests.card_*_path) — these are Supabase
--   Storage object paths, not URL routes.

-- Stale parallel /feather rows from a May-2026 experiment shadowed the
-- live /app rows. Wipe them first so the rename below can settle into
-- the unique-constraint slot without conflict. user_page_permissions
-- had no /feather rows, so this DELETE is page_permissions-only.
DELETE FROM public.page_permissions
  WHERE path = '/feather' OR path LIKE '/feather/%';

UPDATE public.page_permissions
  SET path = '/feather' || substr(path, length('/app') + 1)
  WHERE path = '/app' OR path LIKE '/app/%';

UPDATE public.user_page_permissions
  SET path = '/feather' || substr(path, length('/app') + 1)
  WHERE path = '/app' OR path LIKE '/app/%';

UPDATE public.activity_log
  SET target_path = '/feather' || substr(target_path, length('/app') + 1)
  WHERE target_path = '/app' OR target_path LIKE '/app/%';

UPDATE public.kaizen_recommendations
  SET target_path = '/feather' || substr(target_path, length('/app') + 1)
  WHERE target_path = '/app' OR target_path LIKE '/app/%';

UPDATE public.users
  SET last_path = '/feather' || substr(last_path, length('/app') + 1)
  WHERE last_path = '/app' OR last_path LIKE '/app/%';
