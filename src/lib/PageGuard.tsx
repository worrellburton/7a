'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { usePagePermissions } from './PagePermissions';

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { isPageAdminOnly, loading: permLoading } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || permLoading || !user) return;
    if (isPageAdminOnly(pathname) && !isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, permLoading, user, isAdmin, pathname, router, isPageAdminOnly]);

  if (authLoading || permLoading) return null;
  if (!user) return null;
  if (isPageAdminOnly(pathname) && !isAdmin) return null;

  return <>{children}</>;
}
