'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db';

export interface PageConfig {
  path: string;
  label: string;
  adminOnly: boolean;
  section: 'nav' | 'popup';
  sort_order: number;
}

const defaultPages: PageConfig[] = [
  { path: '/app', label: 'Home', adminOnly: false, section: 'nav', sort_order: 0 },
  { path: '/app/improvements', label: 'Facilities', adminOnly: false, section: 'nav', sort_order: 1 },
  { path: '/app/compliance', label: 'Compliance', adminOnly: false, section: 'nav', sort_order: 2 },
  { path: '/app/groups', label: 'Groups', adminOnly: false, section: 'nav', sort_order: 3 },
  { path: '/app/frameworks', label: 'Frameworks', adminOnly: false, section: 'nav', sort_order: 4 },
  { path: '/app/users', label: 'Users', adminOnly: true, section: 'popup', sort_order: 0 },
  { path: '/app/pages', label: 'Pages', adminOnly: true, section: 'popup', sort_order: 1 },
];

interface PagePermissionsContextType {
  pages: PageConfig[];
  navPages: PageConfig[];
  popupPages: PageConfig[];
  setPageAdminOnly: (path: string, adminOnly: boolean) => void;
  isPageAdminOnly: (path: string) => boolean;
  updatePageLayout: (updatedPages: PageConfig[]) => void;
  loading: boolean;
}

const PagePermissionsContext = createContext<PagePermissionsContextType>({
  pages: defaultPages,
  navPages: defaultPages.filter((p) => p.section === 'nav'),
  popupPages: defaultPages.filter((p) => p.section === 'popup'),
  setPageAdminOnly: () => {},
  isPageAdminOnly: () => false,
  updatePageLayout: () => {},
  loading: true,
});

export function PagePermissionsProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<PageConfig[]>(defaultPages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await db({
          action: 'select',
          table: 'page_permissions',
          select: 'path, admin_only, section, sort_order',
        });

        // Only apply DB overrides if query succeeded and returned data
        if (Array.isArray(data) && data.length > 0) {
          setPages((prev) =>
            prev.map((p) => {
              const match = data.find((d: { path: string }) => d.path === p.path);
              if (match) {
                return {
                  ...p,
                  adminOnly: match.admin_only ?? p.adminOnly,
                  // Only override section/sort_order if they exist in DB
                  section: (match.section === 'nav' || match.section === 'popup') ? match.section : p.section,
                  sort_order: typeof match.sort_order === 'number' ? match.sort_order : p.sort_order,
                };
              }
              return p;
            })
          );
        }
        // If query fails or returns nothing, defaults are used — that's fine
      } catch {
        // DB unavailable — use hardcoded defaults
      }
      setLoading(false);
    }
    load();
  }, []);

  const setPageAdminOnly = async (path: string, adminOnly: boolean) => {
    if (path === '/app/users' || path === '/app/pages') return;

    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, adminOnly } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, admin_only: adminOnly }],
      onConflict: 'path',
    });
  };

  const isPageAdminOnly = (path: string) => {
    const page = pages.find((p) => p.path === path);
    return page?.adminOnly ?? false;
  };

  const updatePageLayout = useCallback(async (updatedPages: PageConfig[]) => {
    setPages(updatedPages);

    const upserts = updatedPages.map((p) => ({
      path: p.path,
      admin_only: p.adminOnly,
      section: p.section,
      sort_order: p.sort_order,
    }));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: upserts,
      onConflict: 'path',
    });
  }, []);

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const navPages = sorted.filter((p) => p.section === 'nav');
  const popupPages = sorted.filter((p) => p.section === 'popup');

  return (
    <PagePermissionsContext.Provider value={{ pages, navPages, popupPages, setPageAdminOnly, isPageAdminOnly, updatePageLayout, loading }}>
      {children}
    </PagePermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  return useContext(PagePermissionsContext);
}
