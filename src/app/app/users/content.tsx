'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
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
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

function pageLabelFromPath(path: string | null): string {
  if (!path) return '';
  if (path === '/app' || path === '/app/') return 'Home';
  const parts = path.split('/').filter(Boolean); // ['app','calendar']
  const last = parts[parts.length - 1] || '';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editingJobTitle, setEditingJobTitle] = useState<string | null>(null);
  const [jobTitleDraft, setJobTitleDraft] = useState('');
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

    fetchUsers();
    fetchDepartments();
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
  }

  async function toggleAdmin(userId: string, currentValue: boolean) {
    const result = await db({ action: 'update', table: 'users', data: { is_admin: !currentValue }, match: { id: userId } });

    if (result?.error) {
      console.error('Toggle admin error:', result.error);
      showToast(`Failed to update: ${result.error}`);
      return;
    }

    // Verify the update actually persisted
    const verify = await db({ action: 'select', table: 'users', match: { id: userId }, select: 'is_admin' });

    if (Array.isArray(verify) && verify[0] && verify[0].is_admin === !currentValue) {
      const updated = users.find((u) => u.id === userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentValue } : u))
      );
      showToast(`${updated?.full_name || 'User'} ${!currentValue ? 'granted' : 'removed'} admin access`);
    } else {
      showToast('Update blocked by database permissions — check RLS policies');
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
  }

  async function saveJobTitle(userId: string) {
    const trimmed = jobTitleDraft.trim() || null;
    const result = await db({ action: 'update', table: 'users', data: { job_title: trimmed }, match: { id: userId } });

    if (result?.error) {
      showToast(`Failed to update job title: ${result.error}`);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, job_title: trimmed } : u)));
    }
    setEditingJobTitle(null);
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Users</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          People who have signed into the patient portal.
        </p>
      </div>

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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Viewing</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Department</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Job Title</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Super Admin</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Joined</th>
                  <th className="px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider w-12" style={{ fontFamily: 'var(--font-body)' }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
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
                      <select
                        value={u.department_id || ''}
                        onChange={(e) => updateDepartment(u.id, e.target.value || null)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white max-w-[160px]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <option value="">—</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {editingJobTitle === u.id ? (
                        <input
                          autoFocus
                          value={jobTitleDraft}
                          onChange={(e) => setJobTitleDraft(e.target.value)}
                          onBlur={() => saveJobTitle(u.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveJobTitle(u.id); if (e.key === 'Escape') setEditingJobTitle(null); }}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full max-w-[160px]"
                          style={{ fontFamily: 'var(--font-body)' }}
                          placeholder="Add job title..."
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingJobTitle(u.id); setJobTitleDraft(u.job_title || ''); }}
                          className="text-xs text-foreground/50 hover:text-foreground transition-colors text-left"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {u.job_title || <span className="text-foreground/25 italic">Add title...</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                        className={`w-5 h-5 rounded-full border-2 transition-all inline-flex items-center justify-center ${
                          u.is_admin
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300 hover:border-primary/50'
                        }`}
                        aria-label={`${u.is_admin ? 'Remove' : 'Grant'} super admin for ${u.full_name || u.email}`}
                        title={u.is_admin ? 'Super admin — click to revoke' : 'Click to grant super admin'}
                      >
                        {u.is_admin && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
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
