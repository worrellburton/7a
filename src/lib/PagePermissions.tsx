'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/AuthProvider';

export interface PageConfig {
  path: string;
  label: string;
  adminOnly: boolean;
  section: 'nav' | 'popup';
  sort_order: number;
  // Department IDs permitted to view the page. Empty array = unrestricted.
  // Admins always see the page regardless of this list.
  allowedDepartments: string[];
  // The department this page is grouped under in the sidebar nav.
  // null = appears in the ungrouped section at the top.
  departmentId: string | null;
}

const defaultPages: PageConfig[] = [
  { path: '/app', label: 'Home', adminOnly: false, section: 'nav', sort_order: 0, allowedDepartments: [], departmentId: null },
  { path: '/app/facilities', label: 'Facilities', adminOnly: false, section: 'nav', sort_order: 1, allowedDepartments: [], departmentId: null },
  { path: '/app/compliance', label: 'Compliance', adminOnly: false, section: 'nav', sort_order: 2, allowedDepartments: [], departmentId: null },
  { path: '/app/groups', label: 'Groups', adminOnly: false, section: 'nav', sort_order: 3, allowedDepartments: [], departmentId: null },
  { path: '/app/notes', label: 'Notes', adminOnly: false, section: 'nav', sort_order: 12, allowedDepartments: [], departmentId: null },
  { path: '/app/policies', label: 'Policies', adminOnly: false, section: 'nav', sort_order: 13, allowedDepartments: [], departmentId: null },
  { path: '/app/kingdom-requests', label: 'Kingdom Requests', adminOnly: false, section: 'popup', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/app/calendar', label: 'Calendar', adminOnly: false, section: 'nav', sort_order: 4, allowedDepartments: [], departmentId: null },
  { path: '/app/equine', label: 'Horses', adminOnly: false, section: 'nav', sort_order: 5, allowedDepartments: [], departmentId: null },
  { path: '/app/billing', label: 'Billing', adminOnly: false, section: 'nav', sort_order: 6, allowedDepartments: [], departmentId: null },
  { path: '/app/calls', label: 'Calls', adminOnly: false, section: 'nav', sort_order: 7, allowedDepartments: [], departmentId: null },
  { path: '/app/fleet', label: 'Fleet', adminOnly: false, section: 'nav', sort_order: 8, allowedDepartments: [], departmentId: null },
  { path: '/app/finance', label: 'Finance', adminOnly: true, section: 'nav', sort_order: 9, allowedDepartments: [], departmentId: null },
  { path: '/app/job-descriptions', label: 'Job Descriptions', adminOnly: false, section: 'nav', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/app/tours', label: 'Tours', adminOnly: false, section: 'nav', sort_order: 11, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Org Chart is now accessed from inside another page (no longer in the popup menu).
  { path: '/app/team', label: 'Team', adminOnly: true, section: 'popup', sort_order: 0, allowedDepartments: [], departmentId: null },
  { path: '/app/pages', label: 'Pages', adminOnly: true, section: 'popup', sort_order: 1, allowedDepartments: [], departmentId: null },
  { path: '/app/departments', label: 'Departments', adminOnly: true, section: 'popup', sort_order: 2, allowedDepartments: [], departmentId: null },
  { path: '/app/apis', label: 'APIs', adminOnly: true, section: 'popup', sort_order: 3, allowedDepartments: [], departmentId: null },
  { path: '/app/super-admin', label: 'Super Admin', adminOnly: true, section: 'popup', sort_order: 4, allowedDepartments: [], departmentId: null },
  { path: '/app/activity', label: 'Activity', adminOnly: true, section: 'popup', sort_order: 5, allowedDepartments: [], departmentId: null },
];

interface PagePermissionsContextType {
  pages: PageConfig[];
  navPages: PageConfig[];
  popupPages: PageConfig[];
  setPageAdminOnly: (path: string, adminOnly: boolean) => void;
  setPageDepartments: (path: string, allowedDepartments: string[]) => void;
  setPageDepartmentGroup: (path: string, departmentId: string | null) => void;
  isPageAdminOnly: (path: string) => boolean;
  // True when `userDepartmentId` (may be null) is allowed to view `path`.
  // Unrestricted pages (empty allowedDepartments) are always allowed.
  isPageAllowedForDepartment: (path: string, userDepartmentId: string | null) => boolean;
  updatePageLayout: (updatedPages: PageConfig[]) => void;
  loading: boolean;
}

const PagePermissionsContext = createContext<PagePermissionsContextType>({
  pages: defaultPages,
  navPages: defaultPages.filter((p) => p.section === 'nav'),
  popupPages: defaultPages.filter((p) => p.section === 'popup'),
  setPageAdminOnly: () => {},
  setPageDepartments: () => {},
  setPageDepartmentGroup: () => {},
  isPageAdminOnly: () => false,
  isPageAllowedForDepartment: () => true,
  updatePageLayout: () => {},
  loading: true,
});

export function PagePermissionsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [pages, setPages] = useState<PageConfig[]>(defaultPages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      try {
        const data = await db({
          action: 'select',
          table: 'page_permissions',
          select: 'path, admin_only, section, sort_order, allowed_departments, department_id',
        });

        // Only apply DB overrides if query succeeded and returned data
        if (Array.isArray(data) && data.length > 0) {
          // Ensure any new defaultPages missing from DB get inserted
          const dbPaths = new Set(data.map((d: { path: string }) => d.path));
          const missing = defaultPages.filter((p) => !dbPaths.has(p.path));
          if (missing.length > 0) {
            for (const m of missing) {
              await db({ action: 'upsert', table: 'page_permissions', data: [{ path: m.path, admin_only: m.adminOnly, section: m.section, sort_order: m.sort_order, allowed_departments: [], department_id: null }], onConflict: 'path' });
            }
          }

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
                  allowedDepartments: Array.isArray(match.allowed_departments) ? match.allowed_departments : [],
                  departmentId: match.department_id ?? null,
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
  }, [session]);

  const setPageAdminOnly = async (path: string, adminOnly: boolean) => {
    if (path === '/app/team' || path === '/app/pages') return;

    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, adminOnly } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, admin_only: adminOnly }],
      onConflict: 'path',
    });
  };

  const setPageDepartments = async (path: string, allowedDepartments: string[]) => {
    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, allowedDepartments } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, allowed_departments: allowedDepartments }],
      onConflict: 'path',
    });
  };

  const setPageDepartmentGroup = async (path: string, departmentId: string | null) => {
    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, departmentId } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, department_id: departmentId }],
      onConflict: 'path',
    });
  };

  const isPageAdminOnly = (path: string) => {
    const page = pages.find((p) => p.path === path);
    return page?.adminOnly ?? false;
  };

  const isPageAllowedForDepartment = (path: string, userDepartmentId: string | null) => {
    const page = pages.find((p) => p.path === path);
    if (!page) return true;
    // Empty list = unrestricted
    if (!page.allowedDepartments || page.allowedDepartments.length === 0) return true;
    if (!userDepartmentId) return false;
    return page.allowedDepartments.includes(userDepartmentId);
  };

  const updatePageLayout = useCallback(async (updatedPages: PageConfig[]) => {
    setPages(updatedPages);

    const upserts = updatedPages.map((p) => ({
      path: p.path,
      admin_only: p.adminOnly,
      section: p.section,
      sort_order: p.sort_order,
      allowed_departments: p.allowedDepartments || [],
      department_id: p.departmentId || null,
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
    <PagePermissionsContext.Provider value={{ pages, navPages, popupPages, setPageAdminOnly, setPageDepartments, setPageDepartmentGroup, isPageAdminOnly, isPageAllowedForDepartment, updatePageLayout, loading }}>
      {children}
    </PagePermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  return useContext(PagePermissionsContext);
}
