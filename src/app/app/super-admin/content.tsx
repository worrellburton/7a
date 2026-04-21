'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { useEffect, useMemo, useState } from 'react';

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

const ROOT_ADMIN_EMAIL = 'bobby@sevenarrowsrecovery.com';
const isRootAdmin = (email: string | null | undefined) =>
  (email || '').toLowerCase() === ROOT_ADMIN_EMAIL;

export default function SuperAdminContent() {
  const { session, user, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({
        action: 'select',
        table: 'users',
        select: 'id, email, full_name, avatar_url, is_admin',
        order: { column: 'full_name', ascending: true },
      }).catch(() => []);
      if (Array.isArray(data)) setUsers(data as AppUser[]);
      setLoading(false);
    }
    load();
  }, [session]);

  async function toggleAdmin(u: AppUser, next: boolean) {
    // Root super admin can never be demoted from this UI.
    if (isRootAdmin(u.email) && next === false) return;
    setBusyId(u.id);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: next } : x)));
    const res = await db({ action: 'update', table: 'users', data: { is_admin: next }, match: { id: u.id } }).catch(() => null);
    if (!res || (typeof res === 'object' && 'error' in res)) {
      // revert on failure
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !next } : x)));
    } else if (user?.id) {
      logActivity({
        userId: user.id,
        type: 'user.role_changed',
        targetKind: 'user',
        targetId: u.id,
        targetLabel: u.full_name || u.email,
        targetPath: '/app/super-admin',
        metadata: { is_admin: next },
      });
    }
    setBusyId(null);
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, filter]);

  if (!isAdmin) {
    return (
      <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
        You need to be an admin to view this page.
      </div>
    );
  }

  const adminCount = users.filter((u) => u.is_admin).length;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl">
      <div className="flex items-baseline justify-between mb-6 gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Super Admin</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Grant or revoke admin access. {adminCount} {adminCount === 1 ? 'admin' : 'admins'} total.
          </p>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search team…"
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            No team members match that search.
          </div>
        ) : (
          visible.map((u, idx) => {
            const isSelf = u.id === user?.id;
            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 px-5 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt={u.full_name || ''} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                    {(u.full_name || u.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.full_name || 'Unnamed'}
                    {isSelf && <span className="ml-2 text-[11px] text-foreground/40">(you)</span>}
                  </p>
                  <p className="text-xs text-foreground/50 truncate">{u.email}</p>
                </div>
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
                    <span className={`text-xs font-medium ${u.is_admin ? 'text-primary' : 'text-foreground/40'}`}>
                      {u.is_admin ? 'Super Admin' : 'Not super admin'}
                    </span>
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
                  </label>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
