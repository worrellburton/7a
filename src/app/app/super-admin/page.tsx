import { redirect } from 'next/navigation';

// /app/super-admin was renamed to /app/user-permissions in Phase 1 of
// the User Permissions overhaul. Keep the old path alive as a server
// redirect so bookmarks, links in commit messages, and Activity log
// entries pointing at the old route still work.

export default function LegacySuperAdminRedirect() {
  redirect('/app/user-permissions');
}
