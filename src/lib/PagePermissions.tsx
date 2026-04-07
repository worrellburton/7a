'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface PageConfig {
  path: string;
  label: string;
  adminOnly: boolean;
}

const defaultPages: PageConfig[] = [
  { path: '/app', label: 'Home', adminOnly: false },
  { path: '/app/improvements', label: 'Facilities', adminOnly: false },
  { path: '/app/compliance', label: 'Compliance', adminOnly: false },
  { path: '/app/frameworks', label: 'Frameworks', adminOnly: false },
  { path: '/app/users', label: 'Users', adminOnly: true },
  { path: '/app/pages', label: 'Pages', adminOnly: true },
];

interface PagePermissionsContextType {
  pages: PageConfig[];
  setPageAdminOnly: (path: string, adminOnly: boolean) => void;
  isPageAdminOnly: (path: string) => boolean;
  loading: boolean;
}

const PagePermissionsContext = createContext<PagePermissionsContextType>({
  pages: defaultPages,
  setPageAdminOnly: () => {},
  isPageAdminOnly: () => false,
  loading: true,
});

export function PagePermissionsProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<PageConfig[]>(defaultPages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('page_permissions')
        .select('path, admin_only');

      if (data && data.length > 0) {
        setPages((prev) =>
          prev.map((p) => {
            const match = data.find((d: { path: string; admin_only: boolean }) => d.path === p.path);
            return match ? { ...p, adminOnly: match.admin_only } : p;
          })
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const setPageAdminOnly = async (path: string, adminOnly: boolean) => {
    // Always keep Users and Pages as admin-only
    if (path === '/app/users' || path === '/app/pages') return;

    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, adminOnly } : p)));

    await supabase
      .from('page_permissions')
      .upsert({ path, admin_only: adminOnly }, { onConflict: 'path' });
  };

  const isPageAdminOnly = (path: string) => {
    const page = pages.find((p) => p.path === path);
    return page?.adminOnly ?? false;
  };

  return (
    <PagePermissionsContext.Provider value={{ pages, setPageAdminOnly, isPageAdminOnly, loading }}>
      {children}
    </PagePermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  return useContext(PagePermissionsContext);
}
