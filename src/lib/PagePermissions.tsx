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
  // Optional named group label (e.g. "Media") that overrides departmentId
  // for sidebar grouping purposes. Pure code-side concept — not stored in
  // the `page_permissions` DB table — so product areas like Media can hang
  // off a shared header without needing a fake department row.
  navGroup?: string | null;
  // When true, the page is visible exclusively to users with
  // user_kind='alumni'. Staff / admins / super-admins lose sidebar
  // entry + route access. Defaults to false; toggled per-page from
  // /app/admin/user-permissions → Alumni tab.
  alumniOnly?: boolean;
  // Optional external URL. When set, the sidebar renders this page
  // as a target="_blank" anchor instead of an internal Link, and
  // the recency click-tracker still records the sentinel path so
  // it participates in reordering like any other nav entry.
  externalUrl?: string;
}

const defaultPages: PageConfig[] = [
  { path: '/app', label: 'Home', adminOnly: false, section: 'nav', sort_order: 0, allowedDepartments: [], departmentId: null },
  // Connect-4 tournament — team-bonding game shipped across 10 phases.
  // Phase 1: page scaffold + schema. Visible to all staff so the
  // tournament participant pool isn't gated unnecessarily.
  { path: '/app/games/connect4', label: 'Connect-4', adminOnly: false, section: 'nav', sort_order: 99, allowedDepartments: [], departmentId: null },
  // Hardware inventory — admin-only because the list contains PINs,
  // account credentials, and asset values that aren't appropriate
  // for general staff visibility.
  { path: '/app/hardware', label: 'Hardware', adminOnly: true, section: 'nav', sort_order: 80, allowedDepartments: [], departmentId: null },
  // External link to the marketing site. Routed through the sidebar
  // like any other entry so it participates in recency reordering;
  // the externalUrl field makes PlatformShell render it as an
  // anchor (target=_blank) instead of an internal Link.
  { path: '/app/website', label: 'Website', adminOnly: false, section: 'nav', sort_order: 99, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9', externalUrl: 'https://www.sevenarrowsrecoveryarizona.com/' },
  { path: '/app/facilities', label: 'Facilities', adminOnly: false, section: 'nav', sort_order: 1, allowedDepartments: [], departmentId: null },
  { path: '/app/compliance', label: 'Compliance', adminOnly: false, section: 'nav', sort_order: 2, allowedDepartments: [], departmentId: null },
  { path: '/app/groups', label: 'Groups', adminOnly: false, section: 'nav', sort_order: 3, allowedDepartments: [], departmentId: null },
  { path: '/app/notes', label: 'Notes', adminOnly: false, section: 'nav', sort_order: 12, allowedDepartments: [], departmentId: null },
  { path: '/app/policies', label: 'Policies', adminOnly: false, section: 'nav', sort_order: 13, allowedDepartments: [], departmentId: null },
  { path: '/app/clients', label: 'Clients', adminOnly: false, section: 'nav', sort_order: 14, allowedDepartments: [], departmentId: null },
  { path: '/app/kingdom-requests', label: 'Kingdom Requests', adminOnly: false, section: 'popup', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/app/calendar', label: 'Calendar', adminOnly: false, section: 'nav', sort_order: 4, allowedDepartments: [], departmentId: null },
  { path: '/app/equine', label: 'Horses', adminOnly: false, section: 'nav', sort_order: 5, allowedDepartments: [], departmentId: null },
  { path: '/app/billing', label: 'Billing', adminOnly: false, section: 'nav', sort_order: 6, allowedDepartments: [], departmentId: null },
  { path: '/app/calls', label: 'Calls', adminOnly: false, section: 'nav', sort_order: 7, allowedDepartments: [], departmentId: null },
  { path: '/app/fleet', label: 'Fleet', adminOnly: false, section: 'nav', sort_order: 8, allowedDepartments: [], departmentId: null },
  { path: '/app/finance', label: 'Finance', adminOnly: true, section: 'nav', sort_order: 9, allowedDepartments: [], departmentId: null },
  { path: '/app/job-descriptions', label: 'Job Descriptions', adminOnly: false, section: 'nav', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/app/tours', label: 'Tours', adminOnly: false, section: 'nav', sort_order: 11, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/outreach', label: 'Marketing', adminOnly: false, section: 'nav', sort_order: 15.2, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/partnerships', label: 'BD Partnerships', adminOnly: false, section: 'nav', sort_order: 15.4, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/donations', label: 'Donations', adminOnly: false, section: 'nav', sort_order: 15.6, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/intake-paperwork', label: 'Intake Paperwork', adminOnly: false, section: 'nav', sort_order: 16, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/seo', label: 'SEO', adminOnly: false, section: 'nav', sort_order: 20, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/geo', label: 'GEO', adminOnly: false, section: 'nav', sort_order: 21, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/analytics', label: 'Analytics', adminOnly: false, section: 'nav', sort_order: 22, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/images', label: 'Images', adminOnly: false, section: 'nav', sort_order: 18, allowedDepartments: [], departmentId: null, navGroup: 'Media' },
  { path: '/app/video', label: 'Video', adminOnly: false, section: 'nav', sort_order: 19, allowedDepartments: [], departmentId: null, navGroup: 'Media' },
  { path: '/app/website-requests', label: 'Website Requests', adminOnly: false, section: 'nav', sort_order: 23, allowedDepartments: ['dfde0b96-c605-40dd-84e5-281af2f6d8e9'], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/app/landing', label: 'Landing', adminOnly: false, section: 'nav', sort_order: 24, allowedDepartments: ['dfde0b96-c605-40dd-84e5-281af2f6d8e9'], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Social Media is super-admin-only — posting attribution and the
  // Ayrshare account are tied to the org, so the page itself is
  // gated by adminOnly here AND a runtime is_super_admin check
  // inside SocialMediaContent. Admins who aren't super admins see
  // it in the sidebar but bounce to the app root if they navigate
  // in directly. Every /api/social-media/* route enforces the same
  // server-side via requireSuperAdmin.
  { path: '/app/social-media', label: 'Social Media', adminOnly: true, section: 'nav', sort_order: 25, allowedDepartments: [], departmentId: null },
  // Content — super-admin-only AI blog pipeline. Same gating pattern
  // as Social Media: adminOnly here for the sidebar, runtime
  // is_super_admin check inside the page + every /api/content/*
  // route via requireSuperAdmin.
  { path: '/app/content', label: 'Content', adminOnly: true, section: 'nav', sort_order: 26, allowedDepartments: [], departmentId: null },
  // Email Campaigns — marketing-email build → recipients → send.
  // Lives in the Marketing department group like social-media; not
  // admin-only since the same marketing folks own the social channel.
  { path: '/app/email-campaigns', label: 'Email Campaigns', adminOnly: false, section: 'nav', sort_order: 27, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Touchpoint logs — the daily 🪵 board. Org-wide accountability
  // surface, so dept-agnostic (matches Kaizen's pattern) and the
  // auto-upsert on first-load won't wipe a department assignment.
  { path: '/app/daily-logs', label: 'Logs', adminOnly: false, section: 'nav', sort_order: 27.5, allowedDepartments: [], departmentId: null },
  { path: '/app/document-manager', label: 'Document Manager', adminOnly: false, section: 'nav', sort_order: 17, allowedDepartments: [], departmentId: null },
  // Org Chart is now accessed from inside another page (no longer in the popup menu).
  { path: '/app/reviews', label: 'Reviews', adminOnly: true, section: 'popup', sort_order: 6, allowedDepartments: [], departmentId: null },
  // Levers — super-admin-only broadcast tools (e.g. JD reminder
  // popup). Like Social Media, the page is gated by adminOnly here
  // AND a runtime is_super_admin check inside so non-super admins
  // see it surface but bounce to the app root if they navigate in.
  { path: '/app/levers', label: 'Levers and switches', adminOnly: true, section: 'popup', sort_order: 7, allowedDepartments: [], departmentId: null },
  { path: '/app/team', label: 'Team', adminOnly: true, section: 'popup', sort_order: 0, allowedDepartments: [], departmentId: null },
  // Kaizen — super-admin-only daily codebase scan. Lives in the
  // regular sidebar nav for discoverability; the runtime
  // is_super_admin check inside the page bounces non-super admins
  // to /app, and every /api/kaizen/* route enforces super-admin
  // server-side via requireSuperAdmin.
  { path: '/app/kaizen', label: 'Kaizen', adminOnly: true, section: 'nav', sort_order: 90, allowedDepartments: [], departmentId: null },
  // Chat — open to all staff + alumni. PageGuard's per-user override
  // for guests still applies (a guest sees Chat only when a super
  // admin grants /app/chat in their allow-list).
  { path: '/app/chat', label: 'Chat', adminOnly: false, section: 'nav', sort_order: 26, allowedDepartments: [], departmentId: null },
  // Super-admin gate is enforced inside the page itself + on every
  // /api/incoming-users/* route. adminOnly here keeps the link out
  // of regular admins' popup; the page bounces non-super admins to
  // /app on direct navigation.
  // My Profile lives in the popup section so it's manageable from
  // /app/admin/pages alongside the other admin / utility links. The
  // PlatformShell renders its dedicated My Profile button so we
  // skip /app/profile in the popup rendering loops to avoid a
  // duplicate entry in the user popup / mobile drawer.
  { path: '/app/profile', label: 'My Profile', adminOnly: false, section: 'popup', sort_order: 0.1, allowedDepartments: [], departmentId: null },
  // Pages / Incoming Users / Departments / APIs / User Permissions
  // were previously five separate popup entries. They live under
  // /app/admin now — the index there links out to all of them.
  { path: '/app/admin', label: 'Admin', adminOnly: true, section: 'popup', sort_order: 0.5, allowedDepartments: [], departmentId: null },
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
  /**
   * Per-user page overrides loaded from `user_page_permissions` for the
   * currently signed-in user. Maps path → can_view. Absence = inherit
   * (fall back to dept + admin-only rules). Used by `PlatformShell` and
   * `PageGuard` to enforce super-admin-set overrides.
   */
  userOverrides: Record<string, boolean>;
  /**
   * Department ids beyond the user's primary `users.department_id` that
   * a super admin has granted them via `user_extra_departments`. Used
   * by `isPageAllowedForDepartmentSet` (and its callers in PlatformShell
   * / PageGuard) so a member can effectively belong to multiple depts
   * for permission purposes without changing where they sit on the org
   * chart.
   */
  userExtraDepartmentIds: string[];
  /**
   * True if any of `userDepartmentId` plus the signed-in user's extra
   * departments is allowed to view `path`. Mirrors the single-dept
   * check above but accepts a set.
   */
  isPageAllowedForDepartmentSet: (path: string, departmentIds: (string | null)[]) => boolean;
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
  userOverrides: {},
  userExtraDepartmentIds: [],
  isPageAllowedForDepartmentSet: () => true,
  updatePageLayout: () => {},
  loading: true,
});

export function PagePermissionsProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const [pages, setPages] = useState<PageConfig[]>(defaultPages);
  const [loading, setLoading] = useState(true);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [userExtraDepartmentIds, setUserExtraDepartmentIds] = useState<string[]>([]);

  // Load per-user page overrides for the signed-in user. RLS lets the
  // user read their own rows, so this works for non-admin members too.
  useEffect(() => {
    if (!user?.id) {
      setUserOverrides({});
      return;
    }
    let cancelled = false;
    db({
      action: 'select',
      table: 'user_page_permissions',
      match: { user_id: user.id },
      select: 'path, can_view',
    })
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        if (Array.isArray(rows)) {
          for (const r of rows as { path: string; can_view: boolean }[]) {
            map[r.path] = r.can_view;
          }
        }
        setUserOverrides(map);
      })
      .catch(() => { /* table missing or RLS — fall back to inherit */ });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load extra (effective) department memberships for the signed-in
  // user. Same pattern as user_page_permissions — RLS lets the user
  // read their own rows so non-admin members get correct gating.
  useEffect(() => {
    if (!user?.id) {
      setUserExtraDepartmentIds([]);
      return;
    }
    let cancelled = false;
    db({
      action: 'select',
      table: 'user_extra_departments',
      match: { user_id: user.id },
      select: 'department_id',
    })
      .then((rows) => {
        if (cancelled) return;
        if (Array.isArray(rows)) {
          setUserExtraDepartmentIds((rows as { department_id: string }[]).map((r) => r.department_id));
        }
      })
      .catch(() => { /* table missing or RLS — fall back to no extras */ });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      try {
        const data = await db({
          action: 'select',
          table: 'page_permissions',
          select: 'path, admin_only, section, sort_order, allowed_departments, department_id, alumni_only',
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
                  alumniOnly: match.alumni_only === true,
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
    // Team + Pages-admin must always stay admin-only — locking
     // those out would brick the org chart + the pages registry.
    if (path === '/app/team' || path === '/app/admin/pages') return;

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

  const isPageAllowedForDepartmentSet = (path: string, departmentIds: (string | null)[]) => {
    const page = pages.find((p) => p.path === path);
    if (!page) return true;
    if (!page.allowedDepartments || page.allowedDepartments.length === 0) return true;
    const ids = departmentIds.filter((d): d is string => !!d);
    if (ids.length === 0) return false;
    return ids.some((id) => page.allowedDepartments.includes(id));
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

  const sorted = (() => {
    // Dedupe by path: DB may contain stale rows (e.g. the same page saved
    // twice with different sections) that would otherwise render multiple
    // sidebar entries for the same path. First occurrence wins.
    const seen = new Set<string>();
    const unique: PageConfig[] = [];
    for (const p of pages) {
      if (seen.has(p.path)) continue;
      seen.add(p.path);
      unique.push(p);
    }
    return unique.sort((a, b) => a.sort_order - b.sort_order);
  })();
  const navPages = sorted.filter((p) => p.section === 'nav');
  const popupPages = sorted.filter((p) => p.section === 'popup');

  return (
    <PagePermissionsContext.Provider value={{ pages, navPages, popupPages, setPageAdminOnly, setPageDepartments, setPageDepartmentGroup, isPageAdminOnly, isPageAllowedForDepartment, isPageAllowedForDepartmentSet, userOverrides, userExtraDepartmentIds, updatePageLayout, loading }}>
      {children}
    </PagePermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  return useContext(PagePermissionsContext);
}
