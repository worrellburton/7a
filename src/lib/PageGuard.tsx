'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePagePermissions } from './PagePermissions';

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, departmentId, loading: authLoading } = useAuth();
  const { isPageAdminOnly, isPageAllowedForDepartment, loading: permLoading } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();

  const deniedAdmin = isPageAdminOnly(pathname) && !isAdmin;
  const deniedDept = !isAdmin && !isPageAllowedForDepartment(pathname, departmentId);
  const denied = deniedAdmin || deniedDept;

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
