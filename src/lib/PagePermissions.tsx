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
  // When true, the page enforces a runtime is_super_admin check
  // inside its content + every backing API route. Used to surface a
  // small "super-admin only" badge next to the page in the sidebar
  // nav so an admin scanning the rail can tell at a glance which
  // pages are gated tighter than `adminOnly: true` alone implies.
  // Pure code-side concept — not stored in page_permissions — since
  // it tracks the page's runtime gate, not an admin toggle.
  superAdminOnly?: boolean;
  // When true, the page is visible exclusively to users with
  // user_kind='alumni'. Staff / admins / super-admins lose sidebar
  // entry + route access. Defaults to false; toggled per-page from
  // /feather/admin/user-permissions → Alumni tab.
  alumniOnly?: boolean;
  // Optional external URL. When set, the sidebar renders this page
  // as a target="_blank" anchor instead of an internal Link, and
  // the recency click-tracker still records the sentinel path so
  // it participates in reordering like any other nav entry.
  externalUrl?: string;
}

export const defaultPages: PageConfig[] = [
  { path: '/feather', label: 'Home', adminOnly: false, section: 'nav', sort_order: 0, allowedDepartments: [], departmentId: null },
  // Connect-4 tournament page (/feather/games/connect4) used to be a
  // top-level nav entry but the same game now lives inside the
  // Arcade (/feather/arcade/connect-four), so the standalone sidebar
  // link was redundant. The tournament route still resolves —
  // anyone with a bookmark or a direct link reaches it.
  // Hardware inventory — admin-only because the list contains PINs,
  // account credentials, and asset values that aren't appropriate
  // for general staff visibility.
  { path: '/feather/hardware', label: 'Hardware', adminOnly: true, section: 'nav', sort_order: 80, allowedDepartments: [], departmentId: null },
  // External link to the marketing site. Routed through the sidebar
  // like any other entry so it participates in recency reordering;
  // the externalUrl field makes PlatformShell render it as an
  // anchor (target=_blank) instead of an internal Link.
  { path: '/feather/website', label: 'Website', adminOnly: false, section: 'nav', sort_order: 99, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9', externalUrl: 'https://www.sevenarrowsrecoveryarizona.com/' },
  { path: '/feather/facilities', label: 'Facilities', adminOnly: false, section: 'nav', sort_order: 1, allowedDepartments: [], departmentId: null },
  // Identity — the canonical "who we are" reference doc. Same surface
  // any team member would reach for when pitching the program or
  // drafting outbound copy. Org-wide (adminOnly: false, no department)
  // because every role benefits from speaking from the same brief.
  { path: '/feather/identity', label: 'Identity', adminOnly: false, section: 'nav', sort_order: 1.5, allowedDepartments: [], departmentId: null },
  { path: '/feather/compliance', label: 'Compliance', adminOnly: false, section: 'nav', sort_order: 2, allowedDepartments: [], departmentId: null },
  { path: '/feather/groups', label: 'Groups', adminOnly: false, section: 'nav', sort_order: 3, allowedDepartments: [], departmentId: null },
  { path: '/feather/notes', label: 'Notes', adminOnly: false, section: 'nav', sort_order: 12, allowedDepartments: [], departmentId: null },
  { path: '/feather/policies', label: 'Policies', adminOnly: false, section: 'nav', sort_order: 13, allowedDepartments: [], departmentId: null },
  { path: '/feather/clients', label: 'Clients', adminOnly: false, section: 'nav', sort_order: 14, allowedDepartments: [], departmentId: null },
  { path: '/feather/kingdom-requests', label: 'Kingdom Requests', adminOnly: false, section: 'popup', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/feather/calendar', label: 'Calendar', adminOnly: false, section: 'nav', sort_order: 4, allowedDepartments: [], departmentId: null },
  { path: '/feather/equine', label: 'Horses', adminOnly: false, section: 'nav', sort_order: 5, allowedDepartments: [], departmentId: null },
  { path: '/feather/billing', label: 'Billing', adminOnly: false, section: 'nav', sort_order: 6, allowedDepartments: [], departmentId: null },
  // Aircall — the live cloud-phone surface (call log, operator
  // schedule, recordings, AI transcripts). Takes the prime "Calls"
  // slot. The legacy CallTrackingMetrics page now lives at
  // /feather/ctm just below it.
  { path: '/feather/calls', label: 'Calls', adminOnly: false, section: 'nav', sort_order: 7, allowedDepartments: [], departmentId: null },
  // CTM — the original CallTrackingMetrics attribution dashboard,
  // renamed from /feather/calls. Kept intact for historical call
  // data + marketing-source attribution Aircall doesn't provide.
  { path: '/feather/ctm', label: 'CTM', adminOnly: false, section: 'nav', sort_order: 7.5, allowedDepartments: [], departmentId: null },
  { path: '/feather/fleet', label: 'Fleet', adminOnly: false, section: 'nav', sort_order: 8, allowedDepartments: [], departmentId: null },
  { path: '/feather/finance', label: 'Finance', adminOnly: true, section: 'nav', sort_order: 9, allowedDepartments: [], departmentId: null },
  { path: '/feather/job-descriptions', label: 'Job Descriptions', adminOnly: false, section: 'nav', sort_order: 10, allowedDepartments: [], departmentId: null },
  { path: '/feather/tours', label: 'Tours', adminOnly: false, section: 'nav', sort_order: 11, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/contacts', label: 'Contacts', adminOnly: false, section: 'nav', sort_order: 15.2, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/partnerships', label: 'Partners', adminOnly: false, section: 'nav', sort_order: 15.4, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/donations', label: 'Donations', adminOnly: false, section: 'nav', sort_order: 15.6, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/intake-paperwork', label: 'Intake Paperwork', adminOnly: false, section: 'nav', sort_order: 16, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/seo', label: 'SEO', adminOnly: false, section: 'nav', sort_order: 20, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/geo', label: 'GEO', adminOnly: false, section: 'nav', sort_order: 21, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/analytics', label: 'Analytics', adminOnly: false, section: 'nav', sort_order: 22, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/images', label: 'Images', adminOnly: false, section: 'nav', sort_order: 18, allowedDepartments: [], departmentId: null, navGroup: 'Media' },
  { path: '/feather/video', label: 'Video', adminOnly: false, section: 'nav', sort_order: 19, allowedDepartments: [], departmentId: null, navGroup: 'Media' },
  // Radio — the staff station. Anyone signed in can listen; uploading
  // / deleting tracks is super-admin-only, enforced inside the page by
  // isSuperAdmin and server-side by RLS on radio_songs + the `radio`
  // storage bucket (migration 20260610_radio_songs).
  { path: '/feather/radio', label: 'Radio', adminOnly: false, section: 'nav', sort_order: 19.5, allowedDepartments: [], departmentId: null, navGroup: 'Media' },
  { path: '/feather/website-requests', label: 'Website Requests', adminOnly: false, section: 'nav', sort_order: 23, allowedDepartments: ['dfde0b96-c605-40dd-84e5-281af2f6d8e9'], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  { path: '/feather/landing', label: 'Landing', adminOnly: false, section: 'nav', sort_order: 24, allowedDepartments: ['dfde0b96-c605-40dd-84e5-281af2f6d8e9'], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Social Media is super-admin-only — posting attribution and the
  // Ayrshare account are tied to the org, so the page itself is
  // gated by adminOnly here AND a runtime is_super_admin check
  // inside SocialMediaContent. Admins who aren't super admins see
  // it in the sidebar but bounce to the app root if they navigate
  // in directly. Every /api/social-media/* route enforces the same
  // server-side via requireSuperAdmin.
  { path: '/feather/social-media', label: 'Social Media', adminOnly: true, superAdminOnly: true, section: 'nav', sort_order: 25, allowedDepartments: [], departmentId: null },
  // Content — super-admin-only AI blog pipeline. Same gating pattern
  // as Social Media: adminOnly here for the sidebar, runtime
  // is_super_admin check inside the page + every /api/content/*
  // route via requireSuperAdmin.
  // Content — AI blog pipeline. Lives in the Marketing & Admissions
  // department group so marketers see it grouped alongside Tours /
  // Contacts / Partners / Email Campaigns in their sidebar. The
  // server gate (src/lib/content-server.ts requireSuperAdmin) ALSO
  // accepts Marketing department members + per-user overrides
  // (set via /feather/admin/user-permissions → Content tab), so the
  // page is reachable by:
  //   - super admins (always)
  //   - anyone in the Marketing & Admissions department
  //   - anyone with a user_page_permissions row for /feather/content
  // Runtime is_super_admin OR override check inside the page guards
  // the editor surface; every /api/content/* route runs the same
  // gate server-side.
  { path: '/feather/content', label: 'Content', adminOnly: false, section: 'nav', sort_order: 26, allowedDepartments: ['dfde0b96-c605-40dd-84e5-281af2f6d8e9'], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Email Campaigns — marketing-email build → recipients → send.
  // Lives in the Marketing department group like social-media; not
  // admin-only since the same marketing folks own the social channel.
  { path: '/feather/email-campaigns', label: 'Email Campaigns', adminOnly: false, section: 'nav', sort_order: 27, allowedDepartments: [], departmentId: 'dfde0b96-c605-40dd-84e5-281af2f6d8e9' },
  // Touchpoint logs — the daily 🪵 board. Org-wide accountability
  // surface, so dept-agnostic (matches Kaizen's pattern) and the
  // auto-upsert on first-load won't wipe a department assignment.
  { path: '/feather/logs', label: 'Logs', adminOnly: false, section: 'nav', sort_order: 27.5, allowedDepartments: [], departmentId: null },
  { path: '/feather/document-manager', label: 'Document Manager', adminOnly: false, section: 'nav', sort_order: 17, allowedDepartments: [], departmentId: null },
  // Org Chart is now accessed from inside another page (no longer in the popup menu).
  { path: '/feather/reviews', label: 'Reviews', adminOnly: true, section: 'popup', sort_order: 6, allowedDepartments: [], departmentId: null },
  // Levers — super-admin-only broadcast tools (e.g. JD reminder
  // popup). Like Social Media, the page is gated by adminOnly here
  // AND a runtime is_super_admin check inside so non-super admins
  // see it surface but bounce to the app root if they navigate in.
  { path: '/feather/levers', label: 'Levers and switches', adminOnly: true, superAdminOnly: true, section: 'popup', sort_order: 7, allowedDepartments: [], departmentId: null },
  { path: '/feather/team', label: 'Team', adminOnly: true, section: 'popup', sort_order: 0, allowedDepartments: [], departmentId: null },
  // Same grid as Team, but scoped to EVERYONE (staff + alumni) instead of
  // employees only. Admin-gated like Team.
  { path: '/feather/users', label: 'Users', adminOnly: true, section: 'popup', sort_order: 1, allowedDepartments: [], departmentId: null },
  // Kaizen — super-admin-only daily codebase scan. Lives in the
  // regular sidebar nav for discoverability; the runtime
  // is_super_admin check inside the page bounces non-super admins
  // to /feather, and every /api/kaizen/* route enforces super-admin
  // server-side via requireSuperAdmin.
  { path: '/feather/kaizen', label: 'Kaizen', adminOnly: true, superAdminOnly: true, section: 'nav', sort_order: 90, allowedDepartments: [], departmentId: null },
  // Mercury — super-admin-only bookkeeping mirror. The page
  // registered as adminOnly here keeps it out of the rail for
  // non-admins; a runtime is_super_admin check inside content.tsx
  // bounces an admin (non-super) who navigates in directly, and
  // every /api/mercury/* route enforces requireSuperAdmin
  // server-side.
  { path: '/feather/mercury', label: 'Mercury', adminOnly: true, superAdminOnly: true, section: 'nav', sort_order: 9.5, allowedDepartments: [], departmentId: null },
  // HIPAA technical-safeguards audit. Super-admin-gated at the
  // route level (the page itself renders a locked panel for
  // non-super-admins), and the /api/hipaa/scan endpoint enforces
  // the same. Sits in popup (not nav) so it's reachable when
  // needed without claiming a permanent rail slot.
  { path: '/feather/hipaa', label: 'HIPAA audit', adminOnly: true, superAdminOnly: true, section: 'popup', sort_order: 8, allowedDepartments: [], departmentId: null },
  // Chat — open to all staff + alumni. PageGuard's per-user override
  // for guests still applies (a guest sees Chat only when a super
  // admin grants /feather/chat in their allow-list).
  { path: '/feather/chat', label: 'Chat', adminOnly: false, section: 'nav', sort_order: 26, allowedDepartments: [], departmentId: null },
  // Arcade — Seven Arrows themed games + leaderboards, open to
  // both staff and alumni. canSeePage in PlatformShell adds
  // /feather/arcade to the cross-portal allowlist so the alumni-only
  // gate doesn't hide it from staff.
  { path: '/feather/arcade', label: 'Arcade', adminOnly: false, section: 'nav', sort_order: 27, allowedDepartments: [], departmentId: null },

  // ── Alumni portal ──────────────────────────────────────────
  // Alumni-only surfaces. Every entry below carries alumniOnly:true
  // so the sidebar hides them from staff + admins. The pages
  // themselves also gate via userKind === 'alumni' at runtime so a
  // staff member who pastes the URL bounces back to /feather. The
  // moderation page is the one exception — it's gated for staff.
  // Sort orders 100-107 keep alumni surfaces grouped at the
  // bottom of the alumni's sidebar.
  { path: '/feather/alumni', label: 'Home', adminOnly: false, section: 'nav', sort_order: 100, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/reunion', label: 'Reunion', adminOnly: false, section: 'nav', sort_order: 101, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/gratitude', label: 'Gratitude', adminOnly: false, section: 'nav', sort_order: 101.5, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/map', label: 'Map', adminOnly: false, section: 'nav', sort_order: 102, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/peer-support', label: 'Peer support', adminOnly: false, section: 'nav', sort_order: 103, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/meetups', label: 'Meetups', adminOnly: false, section: 'nav', sort_order: 104, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/scholarships', label: 'Scholarships', adminOnly: false, section: 'nav', sort_order: 105, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/resources', label: 'Resources', adminOnly: false, section: 'nav', sort_order: 106, allowedDepartments: [], departmentId: null, alumniOnly: true },
  { path: '/feather/alumni/stories', label: 'Voices & talks', adminOnly: false, section: 'nav', sort_order: 107, allowedDepartments: [], departmentId: null, alumniOnly: true },
  // Alumni-side My Profile. Lives at /feather/alumni/profile (not the
  // staff /feather/profile) so the alumni form — opt-ins, sobriety
  // date, interests — is the canonical identity surface for
  // them. PlatformShell pins this to slot 2 of the alumni
  // sidebar; the path itself is alumniOnly so staff never see
  // the link unless they're a super admin auditing.
  { path: '/feather/alumni/profile', label: 'My Profile', adminOnly: false, section: 'popup', sort_order: 0.2, allowedDepartments: [], departmentId: null, alumniOnly: true },
  // /feather/alumni/u/[id] is intentionally NOT registered here. It's a
  // dynamic route that anyone signed in can reach via a direct link
  // (the reunion guest list, alumni online list, etc.). The API at
  // /api/alumni/profile/[id] already enforces opt-in privacy on the
  // PII fields (phone / email / sobriety_date), so we don't need a
  // separate registry-driven gate for the route itself.
  // Staff-only moderation queue — NOT alumniOnly. adminOnly hides
  // it from non-staff in the sidebar; an alumni who tries to navigate
  // in directly bounces back via the runtime is_admin check in the
  // page itself.
  { path: '/feather/alumni/moderation', label: 'Alumni moderation', adminOnly: true, section: 'popup', sort_order: 107, allowedDepartments: [], departmentId: null },
  // Staff-facing alumni roster. adminOnly + an entry in
  // lib/alumni-admin-paths.ts so alumni admins (is_alumni_admin)
  // also see it in their sidebar even when is_admin is false.
  // Lives at /feather/alumni-roster (not under /feather/alumni/*) so it
  // doesn't confuse the alumni-portal namespace.
  { path: '/feather/alumni-roster', label: 'Alumni', adminOnly: true, section: 'nav', sort_order: 28, allowedDepartments: [], departmentId: null },
  // Super-admin gate is enforced inside the page itself + on every
  // /api/incoming-users/* route. adminOnly here keeps the link out
  // of regular admins' popup; the page bounces non-super admins to
  // /feather on direct navigation.
  // My Profile lives in the popup section so it's manageable from
  // /feather/admin/pages alongside the other admin / utility links. The
  // PlatformShell renders its dedicated My Profile button so we
  // skip /feather/profile in the popup rendering loops to avoid a
  // duplicate entry in the user popup / mobile drawer.
  { path: '/feather/profile', label: 'My Profile', adminOnly: false, section: 'popup', sort_order: 0.1, allowedDepartments: [], departmentId: null },
  // Pages / Incoming Users / Departments / APIs / User Permissions
  // were previously five separate popup entries. They live under
  // /feather/admin now — the index there links out to all of them.
  { path: '/feather/admin', label: 'Admin', adminOnly: true, section: 'popup', sort_order: 0.5, allowedDepartments: [], departmentId: null },
  // Operational health snapshot — stuck campaigns, cron failures,
  // failed-send counts. Super-admin only (the page also runtime-
  // gates on isSuperAdmin, and /api/admin/health is requireSuperAdmin).
  { path: '/feather/admin/health', label: 'Health', adminOnly: true, section: 'popup', sort_order: 0.6, allowedDepartments: [], departmentId: null },
  { path: '/feather/activity', label: 'Activity', adminOnly: true, section: 'popup', sort_order: 5, allowedDepartments: [], departmentId: null },
];

interface PagePermissionsContextType {
  pages: PageConfig[];
  navPages: PageConfig[];
  popupPages: PageConfig[];
  setPageAdminOnly: (path: string, adminOnly: boolean) => void;
  // Alumni-only flag: when set, the page is visible exclusively to
  // alumni and super admins (canSeePage + PageGuard both honour it).
  setPageAlumniOnly: (path: string, alumniOnly: boolean) => void;
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
  setPageAlumniOnly: () => {},
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
              // Carry the code-side `alumniOnly` default through to the
              // seeded row. Without this, a newly added alumni page lands
              // in the DB with alumni_only=false and silently loses its
              // alumni-only gate (this is exactly what dropped Reunion out
              // of the alumni portal). Seeding the flag keeps the rule
              // "any alumni page is automatically in the alumni set" true.
              await db({ action: 'upsert', table: 'page_permissions', data: [{ path: m.path, admin_only: m.adminOnly, section: m.section, sort_order: m.sort_order, allowed_departments: [], department_id: null, alumni_only: m.alumniOnly === true }], onConflict: 'path' });
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
    if (path === '/feather/team' || path === '/feather/admin/pages') return;

    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, adminOnly } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, admin_only: adminOnly }],
      onConflict: 'path',
    });
  };

  const setPageAlumniOnly = async (path: string, alumniOnly: boolean) => {
    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, alumniOnly } : p)));

    await db({
      action: 'upsert',
      table: 'page_permissions',
      data: [{ path, alumni_only: alumniOnly }],
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
    <PagePermissionsContext.Provider value={{ pages, navPages, popupPages, setPageAdminOnly, setPageAlumniOnly, setPageDepartments, setPageDepartmentGroup, isPageAdminOnly, isPageAllowedForDepartment, isPageAllowedForDepartmentSet, userOverrides, userExtraDepartmentIds, updatePageLayout, loading }}>
      {children}
    </PagePermissionsContext.Provider>
  );
}

export function usePagePermissions() {
  return useContext(PagePermissionsContext);
}
