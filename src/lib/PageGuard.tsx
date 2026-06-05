'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePagePermissions } from './PagePermissions';
import { ALUMNI_ADMIN_PATHS } from './alumni-admin-paths';

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
