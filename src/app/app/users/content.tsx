'use client';

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  last_sign_in: string | null;
  created_at: string;
}

export default function UsersContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) return;

    async function fetchUsers() {
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    }

    fetchUsers();
  }, [user]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Users</h1>
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-warm-bg/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Provider</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Last Sign In</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Joined</th>
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
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warm-bg text-xs font-medium text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
                      {u.provider === 'google' && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      )}
                      {u.provider || 'email'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
