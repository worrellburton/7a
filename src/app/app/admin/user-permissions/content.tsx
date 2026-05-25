'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { formatNameWithCredentials } from '@/lib/displayName';
import dynamic from 'next/dynamic';
// Lazy: 482 LOC modal only mounts when an admin clicks a row, never
// on first paint. Skips the route's initial JS bundle.
const PermissionsModal = dynamic(() => import('./PermissionsModal'), { ssr: false });
import AccessGroupsTab from './AccessGroupsTab';
import ContentAccessTab from './ContentAccessTab';

// User Permissions page (renamed from /app/super-admin in Phase 1).
// Same column layout as /app/team — User | Viewing | Department |
// Job Title | Joined — but the trailing actions cell hosts the
// Super Admin toggle + the per-user permissions lock icon instead
// of the trash button.
//
// Department + Job Title are editable inline so super admins can
// reassign without bouncing out to /app/team. Permissions overrides
// open in a modal (PermissionsModal) and write to user_page_permissions.

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  status: 'active' | 'on_hold' | 'denied';
  department_id: string | null;
  job_title: string | null;
  credentials: string | null;
  last_seen_at: string | null;
  last_path: string | null;
  created_at: string;
  // 'staff' (default) or 'alumni' — alumni get their own pill below
  // and are excluded from Pending Approval so they don't show up in
  // two filters at once. Nullable for legacy rows; null === staff.
  user_kind: 'staff' | 'alumni' | null;
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface JobDescriptionLite {
  id: string;
  title: string;
}

type SortKey = 'user' | 'viewing' | 'department' | 'job_title' | 'created_at';
type SortDir = 'asc' | 'desc';
type FilterPill = 'all' | 'team' | 'admins' | 'super_admins' | 'alumni' | 'pending';
type TopTab = 'content' | 'users' | 'groups' | 'alumni';

const ROOT_ADMIN_EMAIL = 'bobby@sevenarrowsrecovery.com';
const isRootAdmin = (email: string | null | undefined) =>
  (email || '').toLowerCase() === ROOT_ADMIN_EMAIL;

function pageLabelFromPath(path: string | null): string {
  if (!path) return '';
  if (path === '/app' || path === '/app/') return 'Home';
  if (path.startsWith('/app/job-descriptions')) return 'Job Descriptions';
  if (path.startsWith('/app/sign')) return 'Signing';
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  const looksLikeId = /^[0-9a-f-]{8,}$/i.test(last) || /^\d+$/.test(last);
  const pick = looksLikeId && parts.length > 1 ? parts[parts.length - 2] : last;
  return pick.charAt(0).toUpperCase() + pick.slice(1).replace(/-/g, ' ');
}

function presenceLabel(lastSeenAt: string | null): { online: boolean; text: string } {
  if (!lastSeenAt) return { online: false, text: 'Offline' };
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 120) return { online: true, text: 'Online now' };
  const min = Math.floor(sec / 60);
  if (min < 60) return { online: false, text: `${min}m ago` };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { online: false, text: `${hr}h ago` };
  const day = Math.floor(hr / 24);
  return { online: false, text: `${day}d ago` };
}

function SortableTh({
  label, sortKey, currentKey, currentDir, onClick, className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={`text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider ${className || ''}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground/80 transition-colors ${isActive ? 'text-foreground/80' : ''}`}
      >
        {label}
        <span className="inline-flex flex-col leading-none text-[8px]">
          <span className={isActive && currentDir === 'asc' ? 'text-foreground' : 'text-foreground/20'}>▲</span>
          <span className={isActive && currentDir === 'desc' ? 'text-foreground' : 'text-foreground/20'}>▼</span>
        </span>
      </button>
    </th>
  );
}

export default function UserPermissionsContent() {
  const { session, user, isAdmin, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [filterPill, setFilterPill] = useState<FilterPill>('all');
  const [topTab, setTopTab] = useState<TopTab>('users');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [permissionsTarget, setPermissionsTarget] = useState<AppUser | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('user');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  // 30s tick so the presence column re-renders ("Online now" → "2m ago")
  // without us re-fetching the whole user list.
  const [, setNowTick] = useState(0);
  // Custom-title state for the Job Title cell — same UX as /app/team:
  // pick "+ Custom title…" → swap the <select> for a free-text input.
  const [customTitleUserId, setCustomTitleUserId] = useState<string | null>(null);
  const [customTitleDraft, setCustomTitleDraft] = useState('');
  // Per-user count of explicit page overrides + extra departments.
  // Surfaced as a small badge next to the lock icon so super admins
  // can see at a glance which users have custom permissions without
  // having to open every modal.
  const [overrideCounts, setOverrideCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    async function fetchUsers() {
      const data = await db({
        action: 'select',
        table: 'users',
        select: 'id, email, full_name, avatar_url, is_admin, is_super_admin, status, department_id, job_title, credentials, last_seen_at, last_path, created_at, user_kind',
        order: { column: 'full_name', ascending: true },
      }).catch(() => []);
      if (!cancelled && Array.isArray(data)) setUsers(data as AppUser[]);
    }
    async function fetchDepartments() {
      const data = await db({
        action: 'select',
        table: 'departments',
        select: 'id, name, color',
        order: { column: 'name', ascending: true },
      }).catch(() => []);
      if (!cancelled && Array.isArray(data)) setDepartments(data as Department[]);
    }
    async function fetchJobDescriptions() {
      const data = await db({
        action: 'select',
        table: 'job_descriptions',
        select: 'id, title',
        order: { column: 'title', ascending: true },
      }).catch(() => []);
      if (!cancelled && Array.isArray(data)) setJobDescriptions(data as JobDescriptionLite[]);
    }
    async function fetchOverrideCounts() {
      const [pageRows, deptRows] = await Promise.all([
        db({ action: 'select', table: 'user_page_permissions', select: 'user_id' }).catch(() => null),
        db({ action: 'select', table: 'user_extra_departments', select: 'user_id' }).catch(() => null),
      ]);
      if (cancelled) return;
      const counts: Record<string, number> = {};
      if (Array.isArray(pageRows)) {
        for (const r of pageRows as Array<{ user_id: string }>) {
          counts[r.user_id] = (counts[r.user_id] || 0) + 1;
        }
      }
      if (Array.isArray(deptRows)) {
        for (const r of deptRows as Array<{ user_id: string }>) {
          counts[r.user_id] = (counts[r.user_id] || 0) + 1;
        }
      }
      setOverrideCounts(counts);
    }
    Promise.all([fetchUsers(), fetchDepartments(), fetchJobDescriptions(), fetchOverrideCounts()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    // Keep presence + recent edits fresh.
    const refresh = setInterval(fetchUsers, 30 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [session]);

  async function toggleAdmin(u: AppUser, next: boolean) {
    if (isRootAdmin(u.email) && next === false) return;
    setBusyId(u.id);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: next } : x)));
    const res = await db({ action: 'update', table: 'users', data: { is_admin: next }, match: { id: u.id } }).catch(() => null);
    if (!res || (typeof res === 'object' && 'error' in res)) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !next } : x)));
    } else if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'user.role_changed',
        targetKind: 'user',
        targetId: u.id,
        targetLabel: u.full_name || u.email,
        targetPath: '/app/user-permissions',
        metadata: { is_admin: next },
      });
    }
    setBusyId(null);
  }

  // The "Super Admin" column toggles is_super_admin (which gates
  // Levers, Social Media, Content, User Permissions itself, and
  // every super-admin-only API route). Promoting to super admin
  // also implicitly sets is_admin = true since super admins are a
  // superset of admins; demoting from super admin keeps is_admin
  // intact so the user doesn't silently lose department-level
  // admin access in the same click.
  async function toggleSuperAdmin(u: AppUser, next: boolean) {
    if (isRootAdmin(u.email) && next === false) return;
    setBusyId(u.id);
    const patch: { is_super_admin: boolean; is_admin?: boolean } = { is_super_admin: next };
    if (next && !u.is_admin) patch.is_admin = true;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? {
      ...x,
      is_super_admin: next,
      is_admin: patch.is_admin ?? x.is_admin,
    } : x)));
    const res = await db({ action: 'update', table: 'users', data: patch, match: { id: u.id } }).catch(() => null);
    if (!res || (typeof res === 'object' && 'error' in res)) {
      // Revert optimistic update on failure.
      setUsers((prev) => prev.map((x) => (x.id === u.id ? {
        ...x,
        is_super_admin: !next,
        is_admin: u.is_admin,
      } : x)));
    } else if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'user.role_changed',
        targetKind: 'user',
        targetId: u.id,
        targetLabel: u.full_name || u.email,
        targetPath: '/app/user-permissions',
        metadata: { is_super_admin: next, is_admin: patch.is_admin },
      });
    }
    setBusyId(null);
  }

  async function updateDepartment(userId: string, departmentId: string | null) {
    const res = await db({ action: 'update', table: 'users', data: { department_id: departmentId }, match: { id: userId } });
    if (res && typeof res === 'object' && 'error' in res) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, department_id: departmentId } : u)));
    if (user?.id) {
      const dept = departments.find((d) => d.id === departmentId);
      logActivity({
        userId: user.id,
        type: 'user.department_changed',
        targetKind: 'user',
        targetId: userId,
        targetLabel: users.find((u) => u.id === userId)?.full_name || 'user',
        targetPath: '/app/user-permissions',
        metadata: { department_id: departmentId, department_name: dept?.name || null },
      });
    }
  }

  async function updateJobTitle(userId: string, jobTitle: string | null) {
    const res = await db({ action: 'update', table: 'users', data: { job_title: jobTitle }, match: { id: userId } });
    if (res && typeof res === 'object' && 'error' in res) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, job_title: jobTitle } : u)));
    if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'user.job_title_changed',
        targetKind: 'user',
        targetId: userId,
        targetLabel: users.find((u) => u.id === userId)?.full_name || 'user',
        targetPath: '/app/user-permissions',
        metadata: { job_title: jobTitle },
      });
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedUsers = useMemo(() => {
    const visible = (() => {
      const q = filter.trim().toLowerCase();
      let list = users;
      switch (filterPill) {
        // Team = anyone with elevated access (admin OR super-admin),
        // excluding alumni who shouldn't double-count.
        case 'team':         list = list.filter((u) => (u.is_admin || u.is_super_admin) && u.user_kind !== 'alumni'); break;
        case 'admins':       list = list.filter((u) => u.is_admin && u.user_kind !== 'alumni'); break;
        case 'super_admins': list = list.filter((u) => u.is_super_admin && u.user_kind !== 'alumni'); break;
        case 'alumni':       list = list.filter((u) => u.user_kind === 'alumni'); break;
        // Pending Approval excludes alumni so reps like Lilly Perry
        // (alumni + on_hold) appear only under the Alumni pill, not
        // in two places at once.
        case 'pending':      list = list.filter((u) => u.status === 'on_hold' && u.user_kind !== 'alumni'); break;
        case 'all':          break;
      }
      if (!q) return list;
      return list.filter(
        (u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    })();
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (va: string | number | null, vb: string | number | null) => {
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    };
    return [...visible].sort((a, b) => {
      switch (sortKey) {
        case 'user':
          return cmp((a.full_name || a.email || '').toLowerCase(), (b.full_name || b.email || '').toLowerCase());
        case 'viewing':
          return cmp(a.last_seen_at ? new Date(a.last_seen_at).getTime() : null, b.last_seen_at ? new Date(b.last_seen_at).getTime() : null);
        case 'department': {
          const da = departments.find((d) => d.id === a.department_id)?.name?.toLowerCase() || null;
          const dpb = departments.find((d) => d.id === b.department_id)?.name?.toLowerCase() || null;
          return cmp(da, dpb);
        }
        case 'job_title':
          return cmp((a.job_title || '').toLowerCase() || null, (b.job_title || '').toLowerCase() || null);
        case 'created_at':
          return cmp(new Date(a.created_at).getTime(), new Date(b.created_at).getTime());
      }
    });
  }, [users, filter, filterPill, sortKey, sortDir, departments]);

  if (!isAdmin) {
    return (
      <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
        You need to be an admin to view this page.
      </div>
    );
  }

  // Per-pill counts mirror the filter logic above so the badges
  // never disagree with what a click actually narrows to. Alumni
  // are intentionally excluded from team / admin / super-admin /
  // pending counts so they live in exactly one bucket.
  const nonAlumni = users.filter((u) => u.user_kind !== 'alumni');
  const adminCount = nonAlumni.filter((u) => u.is_admin).length;
  const superAdminCount = nonAlumni.filter((u) => u.is_super_admin).length;
  const teamCount = nonAlumni.filter((u) => u.is_admin || u.is_super_admin).length;
  const alumniCount = users.filter((u) => u.user_kind === 'alumni').length;
  const pendingCount = nonAlumni.filter((u) => u.status === 'on_hold').length;
  const pillCounts: Record<FilterPill, number> = {
    all: users.length,
    team: teamCount,
    admins: adminCount,
    super_admins: superAdminCount,
    alumni: alumniCount,
    pending: pendingCount,
  };
  const pillLabels: Record<FilterPill, string> = {
    all: 'All',
    team: 'Team',
    admins: 'Admins',
    super_admins: 'Super Admins',
    alumni: 'Alumni',
    pending: 'Pending Approval',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">User Permissions</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {topTab === 'users'
              ? <>Grant super-admin access and per-user page overrides.{' '}
                  <span className="font-medium text-foreground/70">{superAdminCount}</span>{' '}
                  {superAdminCount === 1 ? 'super admin' : 'super admins'} total.</>
              : topTab === 'alumni'
              ? <>Alumni members + the pages only they can see.</>
              : <>Bundle pages + departments + members under a name, then assign in bulk.</>}
          </p>
        </div>
        {topTab === 'users' && (
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search team…"
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        )}
      </div>

      {/* Top-level tabs — Users (default) | Access Groups (super-admin
          builder for named permission templates). */}
      <div className="border-b border-gray-100 mb-5 flex gap-1" style={{ fontFamily: 'var(--font-body)' }}>
        {([
          // Content tab leads the strip — it's the single most
          // requested promotion path (HR flips a teammate into the
          // blog pipeline) and benefits from being first.
          { id: 'content' as TopTab, label: 'Content' },
          { id: 'users' as TopTab, label: 'Users' },
          { id: 'groups' as TopTab, label: 'Access Groups' },
          { id: 'alumni' as TopTab, label: 'Alumni' },
        ]).map((t) => {
          const active = topTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/55 hover:text-foreground/80'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {topTab === 'content' ? (
        <ContentAccessTab />
      ) : topTab === 'groups' ? (
        <AccessGroupsTab />
      ) : topTab === 'alumni' ? (
        <AlumniTab
          users={users}
          onApproveAlumni={async (userId) => {
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
            const res = await db({
              action: 'update',
              table: 'users',
              data: { status: 'active' },
              match: { id: userId },
            }).catch(() => null);
            if (!res) {
              // Roll back the optimistic flip if the write failed.
              setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'on_hold' } : u)));
            }
          }}
        />
      ) : (
      <>

      {/* Pill row — Team is a parent for Admins / Super Admins,
          rendered as a secondary nested row that only shows when
          the user has narrowed into Team (or one of its children).
          Keeps the top row tight while still surfacing the
          sub-filters at one click of depth. */}
      <div className="mb-4 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'team', 'alumni', 'pending'] as FilterPill[]).map((pill) => {
            const active = filterPill === pill || (pill === 'team' && (filterPill === 'admins' || filterPill === 'super_admins'));
            const count = pillCounts[pill];
            const isPending = pill === 'pending';
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setFilterPill(pill)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? isPending
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-primary text-white border border-primary'
                    : 'bg-white text-foreground/60 border border-gray-200 hover:bg-warm-bg'
                }`}
              >
                {pillLabels[pill]}
                <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-[10px] ${
                  active && !isPending ? 'bg-white/20 text-white' : 'bg-foreground/5 text-foreground/55'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {(filterPill === 'team' || filterPill === 'admins' || filterPill === 'super_admins') && (
          <div className="flex items-center gap-1.5 flex-wrap pl-4 border-l-2 border-primary/30">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 pr-1">Team:</span>
            {(['admins', 'super_admins'] as FilterPill[]).map((pill) => {
              const active = filterPill === pill;
              const count = pillCounts[pill];
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setFilterPill(pill)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-white border border-primary'
                      : 'bg-white text-foreground/60 border border-gray-200 hover:bg-warm-bg'
                  }`}
                >
                  {pillLabels[pill]}
                  <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-foreground/5 text-foreground/55'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Loading…
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            No team members match that search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/50">
                  <SortableTh label="User" sortKey="user" currentKey={sortKey} currentDir={sortDir} onClick={toggleSort} />
                  <SortableTh label="Viewing" sortKey="viewing" currentKey={sortKey} currentDir={sortDir} onClick={toggleSort} />
                  <SortableTh label="Department" sortKey="department" currentKey={sortKey} currentDir={sortDir} onClick={toggleSort} className="hidden md:table-cell" />
                  <SortableTh label="Job Title" sortKey="job_title" currentKey={sortKey} currentDir={sortDir} onClick={toggleSort} className="hidden sm:table-cell" />
                  <SortableTh label="Joined" sortKey="created_at" currentKey={sortKey} currentDir={sortDir} onClick={toggleSort} className="hidden lg:table-cell" />
                  <th className="px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Super Admin</th>
                  <th className="px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider text-center" style={{ fontFamily: 'var(--font-body)' }}>Pages</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => {
                  const isSelf = u.id === user?.id;
                  const userDept = departments.find((d) => d.id === u.department_id) || null;
                  return (
                    <tr key={u.id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {formatNameWithCredentials(u.full_name, u.credentials) || 'Unknown'}
                              {isSelf && <span className="ml-2 text-[11px] text-foreground/40">(you)</span>}
                              {u.status === 'on_hold' && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800">
                                  On hold
                                </span>
                              )}
                              {u.status === 'denied' && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-red-700">
                                  Denied
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-foreground/40">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Viewing */}
                      <td className="px-6 py-4">
                        {(() => {
                          const p = presenceLabel(u.last_seen_at);
                          const pageLabel = pageLabelFromPath(u.last_path);
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${p.online ? 'bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse' : 'bg-gray-300'}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground/80 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                                  {p.online && pageLabel ? pageLabel : p.text}
                                </p>
                                {p.online && pageLabel && (
                                  <p className="text-[10px] text-emerald-600" style={{ fontFamily: 'var(--font-body)' }}>Online now</p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        <select
                          value={u.department_id || ''}
                          onChange={(e) => updateDepartment(u.id, e.target.value || null)}
                          className={`text-xs px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 max-w-[180px] ${userDept ? 'font-medium' : 'text-foreground/40 bg-white border border-gray-200'}`}
                          style={{
                            fontFamily: 'var(--font-body)',
                            backgroundColor: userDept ? (userDept.color || '#a0522d') + '1f' : undefined,
                            color: userDept ? (userDept.color || '#a0522d') : undefined,
                          }}
                        >
                          <option value="">—</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Job Title — same dropdown + inline custom-title input as /app/team */}
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {customTitleUserId === u.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={customTitleDraft}
                            placeholder="Custom title…"
                            onChange={(e) => setCustomTitleDraft(e.target.value)}
                            onBlur={() => {
                              const v = customTitleDraft.trim();
                              if (v) updateJobTitle(u.id, v);
                              setCustomTitleUserId(null);
                              setCustomTitleDraft('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const v = customTitleDraft.trim();
                                if (v) updateJobTitle(u.id, v);
                                setCustomTitleUserId(null);
                                setCustomTitleDraft('');
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setCustomTitleUserId(null);
                                setCustomTitleDraft('');
                              }
                            }}
                            className="text-xs px-2 py-1 rounded-lg border border-primary/40 focus:border-primary focus:outline-none bg-white max-w-full sm:max-w-[180px]"
                            style={{ fontFamily: 'var(--font-body)' }}
                          />
                        ) : (
                          <select
                            value={u.job_title || ''}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setCustomTitleDraft('');
                                setCustomTitleUserId(u.id);
                                return;
                              }
                              updateJobTitle(u.id, e.target.value || null);
                            }}
                            className={`text-xs px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white max-w-full sm:max-w-[180px] ${u.job_title ? 'text-foreground' : 'text-foreground/30 italic'}`}
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            <option value="">Add title...</option>
                            <option value="__custom__">+ Custom title…</option>
                            {jobDescriptions.map((j) => (
                              <option key={j.id} value={j.title}>{j.title}</option>
                            ))}
                            {u.job_title && !jobDescriptions.some((j) => j.title === u.job_title) && (
                              <option value={u.job_title}>{u.job_title}</option>
                            )}
                          </select>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {(() => {
                          const d = new Date(u.created_at);
                          const now = new Date();
                          const sameYear = d.getFullYear() === now.getFullYear();
                          const text = sameYear
                            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return (
                            <span
                              className="text-xs text-foreground/50 whitespace-nowrap"
                              style={{ fontFamily: 'var(--font-body)' }}
                              title={d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            >
                              {text}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Super Admin toggle — controls is_super_admin
                          on public.users (and implicitly is_admin
                          when ON). Department-level admin status
                          (is_admin alone) is managed elsewhere. */}
                      <td className="px-6 py-4">
                        {isRootAdmin(u.email) ? (
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary" title="Root super admin — locked">
                            Super Admin
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9z" />
                            </svg>
                          </span>
                        ) : (
                          <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${busyId === u.id ? 'opacity-50' : ''}`}>
                            <span className="relative inline-block w-9 h-5">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={u.is_super_admin}
                                disabled={busyId === u.id || isSelf}
                                onChange={(e) => toggleSuperAdmin(u, e.target.checked)}
                              />
                              <span className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-primary transition-colors" />
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                            </span>
                            <span className={`text-xs font-medium ${u.is_super_admin ? 'text-primary' : 'text-foreground/40'}`}>
                              {u.is_super_admin ? 'Super Admin' : u.is_admin ? 'Admin' : 'Off'}
                            </span>
                          </label>
                        )}
                      </td>

                      {/* Per-user page permissions — super admins only.
                          When the user already has overrides, the button
                          shows the count + uses a primary tone so it
                          reads as "customized" at a glance. */}
                      <td className="px-6 py-4 text-center">
                        {isSuperAdmin && !isSelf && (() => {
                          const count = overrideCounts[u.id] ?? 0;
                          const customized = count > 0;
                          return (
                            <button
                              type="button"
                              onClick={() => setPermissionsTarget(u)}
                              title={customized
                                ? `${count} custom permission${count === 1 ? '' : 's'} — click to edit`
                                : `Edit page permissions for ${u.full_name || u.email}`}
                              aria-label={`Edit page permissions for ${u.full_name || u.email}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-semibold transition-colors ${
                                customized
                                  ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
                                  : 'border-black/10 bg-white text-foreground/65 hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="4" y="11" width="16" height="9" rx="2" />
                                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                              </svg>
                              {customized ? `${count} custom` : 'Edit'}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {permissionsTarget && (
        <PermissionsModal
          open={!!permissionsTarget}
          onClose={async () => {
            const closing = permissionsTarget;
            setPermissionsTarget(null);
            // Refresh the override counts so the row badge reflects
            // any add/remove the super admin just made in the modal.
            const [pageRows, deptRows] = await Promise.all([
              db({ action: 'select', table: 'user_page_permissions', select: 'user_id' }).catch(() => null),
              db({ action: 'select', table: 'user_extra_departments', select: 'user_id' }).catch(() => null),
            ]);
            const counts: Record<string, number> = {};
            if (Array.isArray(pageRows)) {
              for (const r of pageRows as Array<{ user_id: string }>) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
            }
            if (Array.isArray(deptRows)) {
              for (const r of deptRows as Array<{ user_id: string }>) counts[r.user_id] = (counts[r.user_id] || 0) + 1;
            }
            setOverrideCounts(counts);
            void closing;
          }}
          userId={permissionsTarget.id}
          userLabel={permissionsTarget.full_name || permissionsTarget.email}
          userIsAdmin={permissionsTarget.is_admin}
          userDepartmentId={permissionsTarget.department_id}
        />
      )}
      </>
      )}
    </div>
  );
}

// Top-tab body for the new "Alumni" tab. Two stacked sections:
//   1. The alumni roster (avatar · name · email · staff-flip CTA).
//   2. A checklist of every routed page in /app, where each row
//      flips a single `page_permissions.alumni_only` boolean.
// Alumni-only pages are visible exclusively to users with
// user_kind='alumni' (the PagePermissions gate enforces this on
// route entry + sidebar render). Defaults to off so nothing is
// hidden from staff without an explicit click.
// Canonical list of /app/alumni/* routes. Drives the "All alumni
// pages" master toggle: flipping it ON sets alumni_only=true on
// every path in this list in one batched update, and the page
// list below renders these paths in a dedicated highlighted group.
const ALUMNI_PORTAL_PATHS = new Set<string>([
  '/app/alumni',
  '/app/alumni/map',
  '/app/alumni/peer-support',
  '/app/alumni/meetups',
  '/app/alumni/scholarships',
  '/app/alumni/resources',
  '/app/alumni/stories',
  // Chat lives outside the /app/alumni/* tree but is part of the
  // alumni's daily surface — group it inside the master toggle so
  // a single flip enables / disables the whole community.
  '/app/chat',
]);

function isAlumniPortalPath(path: string): boolean {
  return ALUMNI_PORTAL_PATHS.has(path);
}

interface PagePermRow {
  path: string;
  section: string | null;
  admin_only: boolean;
  alumni_only: boolean;
  sort_order: number | null;
}

function AlumniTab({ users, onApproveAlumni }: { users: AppUser[]; onApproveAlumni: (userId: string) => Promise<void> | void }) {
  const alumni = useMemo(
    () => users.filter((u) => u.user_kind === 'alumni'),
    [users],
  );
  const [pages, setPages] = useState<PagePermRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await db({
        action: 'select',
        table: 'page_permissions',
        select: 'path, section, admin_only, alumni_only, sort_order',
        order: { column: 'sort_order', ascending: true },
      }).catch(() => []);
      if (!cancelled) setPages((rows ?? []) as PagePermRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  async function toggleAlumniOnly(path: string, next: boolean) {
    setPendingPath(path);
    setError(null);
    setPages((prev) => prev?.map((p) => (p.path === path ? { ...p, alumni_only: next } : p)) ?? prev);
    const res = await db({
      action: 'update',
      table: 'page_permissions',
      data: { alumni_only: next },
      match: { path },
    }).catch((e) => { setError(e instanceof Error ? e.message : String(e)); return null; });
    if (!res) {
      // Roll back optimistic flip if the write failed.
      setPages((prev) => prev?.map((p) => (p.path === path ? { ...p, alumni_only: !next } : p)) ?? prev);
    }
    setPendingPath(null);
  }

  // Bulk toggle for the alumni-portal page bundle. Flips every
  // /app/alumni/* row's alumni_only in one go via parallel db
  // updates; rolls back the whole set if any individual write
  // fails (consistency > partial-success here — half-on, half-off
  // is worse than no change at all). Used by the "All alumni
  // pages" master toggle at the top of the alumni section.
  async function toggleAllAlumniPortal(next: boolean) {
    if (!pages) return;
    setPendingPath('__all_alumni_portal__');
    setError(null);
    const targets = pages.filter((p) => isAlumniPortalPath(p.path));
    setPages((prev) => prev?.map((p) => (isAlumniPortalPath(p.path) ? { ...p, alumni_only: next } : p)) ?? prev);
    try {
      await Promise.all(
        targets.map((p) =>
          db({
            action: 'update',
            table: 'page_permissions',
            data: { alumni_only: next },
            match: { path: p.path },
          }),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Roll the whole set back so we don't leave a partial state.
      setPages((prev) => prev?.map((p) => (isAlumniPortalPath(p.path) ? { ...p, alumni_only: !next } : p)) ?? prev);
    } finally {
      setPendingPath(null);
    }
  }

  // Group pages by their `section` so the UI mirrors the sidebar's
  // section structure. Pages without a section land in "Other".
  const grouped = useMemo(() => {
    const map = new Map<string, PagePermRow[]>();
    for (const p of pages ?? []) {
      const key = p.section?.trim() || 'Other';
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [pages]);

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-body)' }}>
      {/* ── Alumni roster ──────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Alumni</h2>
          <p className="text-xs text-foreground/55">
            {alumni.length === 0 ? 'No alumni marked yet.' : `${alumni.length} ${alumni.length === 1 ? 'person' : 'people'}`}
          </p>
        </header>
        {alumni.length === 0 ? (
          <div className="px-5 py-6 text-sm text-foreground/55">
            Mark a user as alumni from <span className="font-medium text-foreground/70">Pending Approval</span> or the
            <span className="font-medium text-foreground/70"> Users</span> list and they&apos;ll appear here.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alumni.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt={u.full_name ?? u.email} className="w-9 h-9 rounded-full object-cover bg-warm-bg" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-warm-bg flex items-center justify-center text-[12px] font-semibold text-foreground/55">
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                    {u.status === 'on_hold' && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-amber-50 text-amber-800 border-amber-200 uppercase tracking-wider">
                        On hold
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-foreground/55 truncate">{u.email}</p>
                </div>
                {/* Approve flips status: on_hold → active. Once
                    they're already active there's nothing to do,
                    so the button is replaced with a quiet
                    "Approved" pill on those rows. */}
                {u.status === 'on_hold' ? (
                  <button
                    type="button"
                    onClick={() => void onApproveAlumni(u.id)}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90"
                  >
                    Approve
                  </button>
                ) : (
                  <span className="shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wider">
                    Approved
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Alumni-only pages ──────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pages alumni can see</h2>
            <p className="mt-0.5 text-[11.5px] text-foreground/55">Pages flipped on here are visible only to alumni. Staff, admins, and super-admins won&apos;t see them.</p>
          </div>
        </header>
        {error && (
          <div className="px-5 pt-3">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</div>
          </div>
        )}
        {pages == null ? (
          <div className="px-5 py-6 text-sm text-foreground/55">Loading pages…</div>
        ) : pages.length === 0 ? (
          <div className="px-5 py-6 text-sm text-foreground/55">No pages registered.</div>
        ) : (() => {
          // Pull the alumni-portal pages out of the main grouped
          // list so we can render them in their own highlighted
          // group with the master toggle on top. Everything else
          // flows through the original section-grouped list below.
          const alumniPortalPages = pages.filter((p) => isAlumniPortalPath(p.path));
          const otherGrouped = grouped
            .map(([section, rows]) => [section, rows.filter((p) => !isAlumniPortalPath(p.path))] as const)
            .filter(([, rows]) => rows.length > 0);
          const allOn = alumniPortalPages.length > 0 && alumniPortalPages.every((p) => p.alumni_only);
          const someOn = alumniPortalPages.some((p) => p.alumni_only);
          const bulkPending = pendingPath === '__all_alumni_portal__';
          return (
            <ol className="divide-y divide-gray-100">
              {/* Master toggle row + grouped alumni-portal pages.
                  Reads as "all alumni pages" → tap once → every
                  alumni portal route gets alumni_only flipped in
                  one go. Indented children show the current state
                  per-page (in case a super admin wants a finer
                  override later). */}
              {alumniPortalPages.length > 0 && (
                <li className="px-5 py-3 bg-primary/5">
                  <div className="flex items-center justify-between gap-3 py-1 mb-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground">All alumni pages</p>
                      <p className="text-[11px] text-foreground/55 mt-0.5">
                        {allOn
                          ? `All ${alumniPortalPages.length} alumni-portal pages are visible to alumni + super admins.`
                          : someOn
                            ? `${alumniPortalPages.filter((p) => p.alumni_only).length} of ${alumniPortalPages.length} on — flip to enable the whole portal at once.`
                            : `Flip ON to make all ${alumniPortalPages.length} alumni-portal pages alumni-only.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleAllAlumniPortal(!allOn)}
                      aria-pressed={allOn}
                      disabled={bulkPending}
                      className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${
                        allOn ? 'bg-primary' : someOn ? 'bg-primary/40' : 'bg-foreground/15'
                      } ${bulkPending ? 'opacity-60' : ''}`}
                      title={allOn ? 'All alumni pages on · click to turn all off' : 'Turn on every alumni-portal page'}
                    >
                      <span
                        aria-hidden
                        className={`absolute top-0.5 ${allOn ? 'left-[22px]' : 'left-0.5'} w-6 h-6 rounded-full bg-white shadow transition-all`}
                      />
                    </button>
                  </div>
                  <ul className="space-y-1 pl-3 border-l-2 border-primary/30">
                    {alumniPortalPages.map((p) => (
                      <li key={p.path} className="flex items-center justify-between gap-3 py-1">
                        <p className="text-[12.5px] font-medium text-foreground/85 truncate">{p.path}</p>
                        <button
                          type="button"
                          onClick={() => void toggleAlumniOnly(p.path, !p.alumni_only)}
                          aria-pressed={p.alumni_only}
                          disabled={pendingPath === p.path || bulkPending}
                          className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${p.alumni_only ? 'bg-primary' : 'bg-foreground/15'} ${pendingPath === p.path || bulkPending ? 'opacity-60' : ''}`}
                          title={p.alumni_only ? 'Alumni-only — click to disable' : 'Click to make alumni-only'}
                        >
                          <span
                            aria-hidden
                            className={`absolute top-0.5 ${p.alumni_only ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full bg-white shadow transition-all`}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              )}

              {/* Every other page, grouped by section as before. */}
              {otherGrouped.map(([section, rows]) => (
                <li key={section} className="px-5 py-3">
                  <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-foreground/45 mb-2">{section}</p>
                  <ul className="space-y-1">
                    {rows.map((p) => (
                      <li key={p.path} className="flex items-center justify-between gap-3 py-1">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-foreground truncate">{p.path}</p>
                          {p.admin_only && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-amber-50 text-amber-800 border-amber-200">Admin-only</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleAlumniOnly(p.path, !p.alumni_only)}
                          aria-pressed={p.alumni_only}
                          disabled={pendingPath === p.path}
                          className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${p.alumni_only ? 'bg-primary' : 'bg-foreground/15'} ${pendingPath === p.path ? 'opacity-60' : ''}`}
                          title={p.alumni_only ? 'Alumni-only — staff cannot see this page' : 'Not alumni-only'}
                        >
                          <span
                            aria-hidden
                            className={`absolute top-0.5 ${p.alumni_only ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full bg-white shadow transition-all`}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          );
        })()}
      </section>
    </div>
  );
}
