'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { useModal } from '@/lib/ModalProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  last_sign_in: string | null;
  created_at: string;
  is_admin: boolean;
  job_title: string | null;
  last_path: string | null;
  last_seen_at: string | null;
  department_id: string | null;
  status: 'active' | 'on_hold' | 'denied';
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

function pageLabelFromPath(path: string | null): string {
  if (!path) return '';
  if (path === '/app' || path === '/app/') return 'Home';
  // Any job-description detail view (e.g. /app/job-descriptions/<uuid>) should
  // just read as "Job Descriptions" — otherwise we'd dump the raw UUID into
  // the column, which looks broken.
  if (path.startsWith('/app/job-descriptions')) return 'Job Descriptions';
  if (path.startsWith('/app/sign')) return 'Signing';
  const parts = path.split('/').filter(Boolean); // ['app','calendar']
  const last = parts[parts.length - 1] || '';
  // If the last segment looks like a UUID, walk back to the previous segment
  // so we don't print the raw ID.
  const looksLikeId = /^[0-9a-f-]{8,}$/i.test(last) || /^\d+$/.test(last);
  const pick = looksLikeId && parts.length > 1 ? parts[parts.length - 2] : last;
  return pick.charAt(0).toUpperCase() + pick.slice(1).replace(/-/g, ' ');
}

function SortableTh({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
  className,
  align,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
  align?: 'left' | 'center';
}) {
  const isActive = currentKey === sortKey;
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`${alignClass} px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider ${className || ''}`}
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

export default function UsersContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const { confirm } = useModal();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionLite[]>([]);
  // Map userId -> Set<jobDescriptionId> of JDs they have signed.
  const [signedByUser, setSignedByUser] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  // force presence labels to re-render every 15s
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setNowTick((n) => n + 1), 15 * 1000);
    return () => clearInterval(i);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) {
      router.replace('/app');
      return;
    }

    async function fetchUsers() {
      const data = await db({ action: 'select', table: 'users', order: { column: 'created_at', ascending: false } });
      if (Array.isArray(data)) {
        setUsers(data);
      }
      setLoading(false);
    }

    async function fetchDepartments() {
      const data = await db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } });
      if (Array.isArray(data)) {
        setDepartments(data);
      }
    }

    async function fetchJobDescriptions() {
      const data = await db({ action: 'select', table: 'job_descriptions', order: { column: 'title', ascending: true } });
      if (Array.isArray(data)) {
        setJobDescriptions(data.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title })));
      }
    }

    async function fetchSignatures() {
      const data = await db({ action: 'select', table: 'jd_signatures', select: 'signer_user_id, job_description_id, signed_at' });
      if (Array.isArray(data)) {
        const map = new Map<string, Set<string>>();
        for (const row of data as Array<{ signer_user_id: string; job_description_id: string; signed_at: string | null }>) {
          if (!row.signed_at) continue;
          const set = map.get(row.signer_user_id) || new Set<string>();
          set.add(row.job_description_id);
          map.set(row.signer_user_id, set);
        }
        setSignedByUser(map);
      }
    }

    fetchUsers();
    fetchDepartments();
    fetchJobDescriptions();
    fetchSignatures();
    // Refresh every 30s so presence stays fresh for the admin watching
    const refreshInterval = setInterval(fetchUsers, 30 * 1000);
    return () => clearInterval(refreshInterval);
  }, [session, isAdmin, router]);

  async function updateDepartment(userId: string, departmentId: string | null) {
    const result = await db({ action: 'update', table: 'users', data: { department_id: departmentId }, match: { id: userId } });
    if (result?.error) {
      showToast(`Failed to update department: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, department_id: departmentId } : u)));
    if (user?.id) {
      const target = users.find((u) => u.id === userId);
      const dept = departments.find((d) => d.id === departmentId);
      logActivity({
        userId: user.id,
        type: 'user.department_changed',
        targetKind: 'user',
        targetId: userId,
        targetLabel: target?.full_name || target?.email || 'user',
        targetPath: '/app/team',
        metadata: { department_id: departmentId, department_name: dept?.name || null },
      });
    }
  }

  async function deleteUser(userId: string, userName: string) {
    if (userId === user?.id) {
      showToast("You can't delete yourself");
      return;
    }
    const ok = await confirm(`Delete ${userName}?`, {
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    const result = await db({ action: 'delete', table: 'users', match: { id: userId } });

    if (result?.error) {
      showToast(`Failed to delete: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast(`${userName} has been removed`);
    if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'user.deleted',
        targetKind: 'user',
        targetId: userId,
        targetLabel: userName,
        targetPath: '/app/team',
      });
    }
  }

  async function updateJobTitle(userId: string, jobTitle: string | null) {
    const result = await db({ action: 'update', table: 'users', data: { job_title: jobTitle }, match: { id: userId } });

    if (result?.error) {
      showToast(`Failed to update job title: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, job_title: jobTitle } : u)));
    if (user?.id) {
      const target = users.find((u) => u.id === userId);
      logActivity({
        userId: user.id,
        type: 'user.job_title_changed',
        targetKind: 'user',
        targetId: userId,
        targetLabel: target?.full_name || target?.email || 'user',
        targetPath: '/app/team',
        metadata: { job_title: jobTitle },
      });
    }
  }

  async function setUserStatus(userId: string, nextStatus: 'active' | 'denied') {
    const target = users.find((u) => u.id === userId);
    if (target && (target.email || '').toLowerCase() === 'bobby@sevenarrowsrecovery.com' && nextStatus !== 'active') {
      showToast("The root super admin can't be denied.");
      return;
    }
    const result = await db({ action: 'update', table: 'users', data: { status: nextStatus }, match: { id: userId } });
    if (result?.error) {
      showToast(`Failed to update status: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
    showToast(nextStatus === 'active' ? `${target?.full_name || target?.email || 'User'} approved` : `${target?.full_name || target?.email || 'User'} denied`);
    if (user?.id) {
      logActivity({
        userId: user.id,
        type: nextStatus === 'active' ? 'user.approved' : 'user.denied',
        targetKind: 'user',
        targetId: userId,
        targetLabel: target?.full_name || target?.email || 'user',
        targetPath: '/app/team',
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

  const sortedUsers = [...users].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (va: string | number | null, vb: string | number | null) => {
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    };
    switch (sortKey) {
      case 'user':
        return cmp((a.full_name || a.email || '').toLowerCase(), (b.full_name || b.email || '').toLowerCase());
      case 'viewing':
        return cmp(a.last_seen_at ? new Date(a.last_seen_at).getTime() : null, b.last_seen_at ? new Date(b.last_seen_at).getTime() : null);
      case 'department': {
        const da = departments.find((d) => d.id === a.department_id)?.name?.toLowerCase() || null;
        const db2 = departments.find((d) => d.id === b.department_id)?.name?.toLowerCase() || null;
        return cmp(da, db2);
      }
      case 'job_title':
        return cmp((a.job_title || '').toLowerCase() || null, (b.job_title || '').toLowerCase() || null);
      case 'created_at':
        return cmp(new Date(a.created_at).getTime(), new Date(b.created_at).getTime());
    }
  });

  if (!user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Team</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            People who have signed into the patient portal.
          </p>
        </div>
        <button
          onClick={() => router.push('/app/org-chart')}
          className="inline-flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md transition-all shrink-0"
          style={{ fontFamily: 'var(--font-body)' }}
          title="View organization chart"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <rect x="3" y="15" width="6" height="4" rx="1" />
            <rect x="15" y="15" width="6" height="4" rx="1" />
            <path d="M12 7v4" />
            <path d="M6 15v-2h12v2" />
          </svg>
          Org Chart
        </button>
      </div>

      {isAdmin && (() => {
        const pending = users.filter((u) => u.status === 'on_hold');
        const denied = users.filter((u) => u.status === 'denied');
        if (pending.length === 0 && denied.length === 0) return null;
        return (
          <div className="mb-8 bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-50 flex items-center justify-between gap-3 bg-amber-50/40">
              <div>
                <p className="text-sm font-semibold text-foreground">Pending Approval</p>
                <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                  Users who signed in with an email outside <span className="font-medium">@sevenarrowsrecovery.com</span>.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                {pending.length} waiting
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {[...pending, ...denied].map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    {u.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name || 'Unknown'}</p>
                      <p className="text-xs text-foreground/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>{u.email}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${u.status === 'denied' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`} style={{ fontFamily: 'var(--font-body)' }}>
                    {u.status === 'denied' ? 'Denied' : 'On Hold'}
                  </span>
                  <div className="flex items-center gap-2">
                    {u.status !== 'active' && (
                      <button
                        onClick={() => setUserStatus(u.id, 'active')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== 'denied' && (
                      <button
                        onClick={() => setUserStatus(u.id, 'denied')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-foreground/70 text-xs font-semibold hover:border-red-300 hover:text-red-600 transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Deny
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-warm-bg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
              No users yet. Users will appear here after they sign in.
            </p>
            <p className="text-xs text-foreground/30 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
              Make sure the <code className="bg-warm-bg px-1.5 py-0.5 rounded text-[11px]">users</code> table exists in Supabase.
            </p>
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
                  <th className="px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider w-12" style={{ fontFamily: 'var(--font-body)' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.full_name || 'Unknown'}</p>
                          <p className="text-xs text-foreground/40">{u.email}</p>
                        </div>
                      </div>
                    </td>
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
                    <td className="px-6 py-4 hidden md:table-cell">
                      {(() => {
                        const userDept = departments.find((d) => d.id === u.department_id) || null;
                        return (
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
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {(() => {
                        const matchedJd = jobDescriptions.find((j) => j.title === u.job_title);
                        const signed = matchedJd ? signedByUser.get(u.id)?.has(matchedJd.id) ?? false : false;
                        return (
                          <div className="flex items-center gap-1.5">
                            {matchedJd && (
                              <span
                                className="relative group/sig shrink-0"
                                aria-label={signed ? 'Signed' : 'Not signed'}
                              >
                                <svg
                                  className={`w-4 h-4 ${signed ? 'text-emerald-500 drop-shadow-[0_0_3px_rgba(16,185,129,0.55)]' : 'text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.55)]'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                                  <text x="12" y="17" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" stroke="none">PDF</text>
                                </svg>
                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 px-2.5 py-1.5 rounded-lg bg-foreground text-white text-[11px] leading-snug whitespace-normal opacity-0 group-hover/sig:opacity-100 transition-opacity w-56 text-center shadow-lg"
                                  style={{ fontFamily: 'var(--font-body)' }}
                                >
                                  {signed
                                    ? `${u.full_name || 'This user'} has signed the ${matchedJd.title} job description.`
                                    : `${u.full_name || 'This user'} has not yet signed the ${matchedJd.title} job description.`}
                                </span>
                              </span>
                            )}
                            <select
                              value={u.job_title || ''}
                              onChange={(e) => updateJobTitle(u.id, e.target.value || null)}
                              className={`text-xs px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white max-w-full sm:max-w-[180px] ${u.job_title ? 'text-foreground' : 'text-foreground/30 italic'}`}
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              <option value="">Add title...</option>
                              {jobDescriptions.map((j) => (
                                <option key={j.id} value={j.title}>{j.title}</option>
                              ))}
                              {u.job_title && !jobDescriptions.some((j) => j.title === u.job_title) && (
                                <option value={u.job_title}>{u.job_title}</option>
                              )}
                            </select>
                            {matchedJd && (
                              <button
                                onClick={() => router.push(`/app/job-descriptions/${matchedJd.id}`)}
                                className="shrink-0 p-1 rounded text-foreground/30 hover:text-primary hover:bg-primary/5 transition-colors"
                                title={`Open ${matchedJd.title} job description`}
                                aria-label={`Open ${matchedJd.title} job description`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 17L17 7" />
                                  <path d="M7 7h10v10" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {(() => {
                        const d = new Date(u.created_at);
                        const now = new Date();
                        const sameYear = d.getFullYear() === now.getFullYear();
                        // Within the current year, drop the year to shorten
                        // the cell; older joins keep the year for clarity.
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
                    <td className="px-6 py-4 text-center">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => deleteUser(u.id, u.full_name || u.email)}
                          className="text-foreground/20 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${u.full_name || u.email}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
