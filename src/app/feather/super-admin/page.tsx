import { redirect } from 'next/navigation';

// /feather/super-admin was renamed to /feather/user-permissions in Phase 1 of
// the User Permissions overhaul. Keep the old path alive as a server
// redirect so bookmarks, links in commit messages, and Activity log
// entries pointing at the old route still work.

export default function LegacySuperAdminRedirect() {
  redirect('/feather/admin/user-permissions');
}
