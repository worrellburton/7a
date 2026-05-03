'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { formatNameWithCredentials } from '@/lib/displayName';
import PermissionsModal from './PermissionsModal';
import AccessGroupsTab from './AccessGroupsTab';

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
type FilterPill = 'all' | 'admins' | 'super_admins' | 'pending';
type TopTab = 'users' | 'groups';

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
        select: 'id, email, full_name, avatar_url, is_admin, is_super_admin, status, department_id, job_title, credentials, last_seen_at, last_path, created_at',
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
        case 'admins':       list = list.filter((u) => u.is_admin); break;
        case 'super_admins': list = list.filter((u) => u.is_super_admin); break;
        case 'pending':      list = list.filter((u) => u.status === 'on_hold'); break;
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

  const adminCount = users.filter((u) => u.is_admin).length;
  const superAdminCount = users.filter((u) => u.is_super_admin).length;
  const pendingCount = users.filter((u) => u.status === 'on_hold').length;
  const pillCounts: Record<FilterPill, number> = {
    all: users.length,
    admins: adminCount,
    super_admins: superAdminCount,
    pending: pendingCount,
  };
  const pillLabels: Record<FilterPill, string> = {
    all: 'All',
    admins: 'Admins',
    super_admins: 'Super Admins',
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
                  <span className="font-medium text-foreground/70">{adminCount}</span>{' '}
                  {adminCount === 1 ? 'super admin' : 'super admins'} total.</>
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
          { id: 'users' as TopTab, label: 'Users' },
          { id: 'groups' as TopTab, label: 'Access Groups' },
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

      {topTab === 'groups' ? (
        <AccessGroupsTab />
      ) : (
      <>

      <div className="flex items-center gap-1.5 mb-4 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
        {(['all', 'super_admins', 'admins', 'pending'] as FilterPill[]).map((pill) => {
          const active = filterPill === pill;
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

                      {/* Super Admin toggle */}
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
                                checked={u.is_admin}
                                disabled={busyId === u.id || isSelf}
                                onChange={(e) => toggleAdmin(u, e.target.checked)}
                              />
                              <span className="absolute inset-0 rounded-full bg-gray-200 peer-checked:bg-primary transition-colors" />
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                            </span>
                            <span className={`text-xs font-medium ${u.is_admin ? 'text-primary' : 'text-foreground/40'}`}>
                              {u.is_admin ? 'Super Admin' : 'Off'}
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
