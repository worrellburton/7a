'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePagePermissions } from './PagePermissions';

// Paths an Alumni Admin can reach even when the page is otherwise
// adminOnly. Their permissions inside the page are auto-narrowed to
// user_kind='alumni' by the page itself; this just lets them past
// the route gate. Kept here (rather than as a per-page flag in the
// permissions registry) because there are only two such surfaces
// and they're the canonical alumni-administration tools.
const ALUMNI_ADMIN_PATHS = new Set<string>([
  '/app/admin/user-permissions',
  '/app/admin/incoming-users',
]);

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isAlumniAdmin, departmentId, loading: authLoading } = useAuth();
  const { isPageAdminOnly, isPageAllowedForDepartmentSet, userOverrides, userExtraDepartmentIds, loading: permLoading } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();

  // Per-user override beats every other rule. Allow grants access even
  // if dept rules / admin-only would deny it; Block denies even if
  // dept rules would allow. Department check uses the merged set
  // (primary + extras granted via /app/user-permissions).
  const override = userOverrides[pathname];
  const alumniAdminPass = isAlumniAdmin && ALUMNI_ADMIN_PATHS.has(pathname);
  const deniedAdmin = isPageAdminOnly(pathname) && !isAdmin && !alumniAdminPass;
  const deniedDept = !isAdmin && !alumniAdminPass && !isPageAllowedForDepartmentSet(pathname, [departmentId, ...userExtraDepartmentIds]);
  const denied = override === false ? true : override === true ? false : (deniedAdmin || deniedDept);

  useEffect(() => {
    if (authLoading || permLoading || !user) return;
    if (denied) {
      router.replace('/app');
    }
  }, [authLoading, permLoading, user, denied, router]);

  if (authLoading || permLoading) return null;
  if (!user) return null;
  if (denied) return null;

  return <>{children}</>;
}
