// Paths an Alumni Admin (is_alumni_admin=true) can reach even when
// the page itself is otherwise admin-only. Mirrors how the regular
// admin / super-admin role gates work — the page inside is auto-
// narrowed to user_kind='alumni' for them.
//
// Kept as a flat string set rather than a permissions-registry flag
// because only a handful of canonical alumni-admin surfaces qualify
// and we don't want a per-page checkbox in /app/admin/pages.
//
// Used by:
//   * src/lib/PageGuard.tsx           — route-level enter gate
//   * src/app/app/PlatformShell.tsx   — sidebar visibility
//   * any /api/* route can also import this to share the same list.

export const ALUMNI_ADMIN_PATHS: ReadonlySet<string> = new Set<string>([
  '/app/admin/user-permissions',
  '/app/admin/incoming-users',
  // Staff-facing roster of every alumnus. Alumni Admins live in this
  // page day-to-day, so they must reach it without is_admin.
  '/app/alumni-roster',
]);
