'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePagePermissions } from './PagePermissions';
import { ALUMNI_ADMIN_PATHS, ALUMNI_VIEWABLE_PATHS } from './alumni-admin-paths';

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isSuperAdmin, isAlumniAdmin, userKind, departmentId, loading: authLoading } = useAuth();
  const { pages, isPageAdminOnly, isPageAllowedForDepartmentSet, userOverrides, userExtraDepartmentIds, loading: permLoading } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();

  // Per-user override beats every other rule. Allow grants access even
  // if dept rules / admin-only would deny it; Block denies even if
  // dept rules would allow. Department check uses the merged set
  // (primary + extras granted via /feather/user-permissions).
  const override = userOverrides[pathname];
  const alumniAdminPass = isAlumniAdmin && ALUMNI_ADMIN_PATHS.has(pathname);
  // Alumni users get past adminOnly on the small list of pages that
  // are explicitly "admin-managed but useful to alumni" — e.g. the
  // alumni roster doubles as a peer directory for alumni themselves,
  // and /feather/chat is the alumni community room.
  const alumniViewerPass = userKind === 'alumni' && ALUMNI_VIEWABLE_PATHS.has(pathname);
  const passAdminGate = isAdmin || alumniAdminPass || alumniViewerPass;
  const deniedAdmin = isPageAdminOnly(pathname) && !passAdminGate;
  const deniedDept = !passAdminGate && !isPageAllowedForDepartmentSet(pathname, [departmentId, ...userExtraDepartmentIds]);
  // Alumni-only pages (the alumni portal) admit alumni + super admins —
  // mirrors PlatformShell's canSeePage. Without this, an employee could
  // reach an alumni-only route by direct URL even though its sidebar link
  // is hidden from them.
  const isAlumniOnlyPage = pages.find((p) => p.path === pathname)?.alumniOnly === true;
  const deniedAlumniOnly = isAlumniOnlyPage && userKind !== 'alumni' && !isSuperAdmin;
  // Chat is the one alumni-only surface with NO super-admin exception —
  // it's a private alumni-to-alumni space, so even super admins are kept
  // out (no moderator access).
  const isChat = pathname === '/feather/chat' || pathname.startsWith('/feather/chat/');
  const deniedChat = isChat && userKind !== 'alumni';
  const denied = override === false ? true : override === true ? false : (deniedAlumniOnly || deniedChat || deniedAdmin || deniedDept);

  useEffect(() => {
    if (authLoading || permLoading || !user) return;
    if (denied) {
      router.replace('/feather');
    }
  }, [authLoading, permLoading, user, denied, router]);

  if (authLoading || permLoading) return null;
  if (!user) return null;
  if (denied) return null;

  return <>{children}</>;
}
