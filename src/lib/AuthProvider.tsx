'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db, setAuthToken } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export type UserStatus = 'active' | 'on_hold' | 'denied';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  departmentId: string | null;
  status: UserStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  departmentId: null,
  status: 'active',
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

let signInLoggedThisSession = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus>('active');

  async function loadProfile(userId: string, email: string | null) {
    // Try the full select first. If it fails (e.g. because the status
    // column hasn't been migrated yet, or the table schema drifted), fall
    // back to just is_admin + department_id so the user's admin state is
    // never silently blanked out by an unrelated DB error. This exact bug
    // once hid Team + Super Admin from every admin's sidebar, so the
    // fallback is intentional belt-and-suspenders.
    type ProfileRow = { is_admin?: boolean; department_id?: string | null; status?: UserStatus };
    let row: ProfileRow | null = null;
    const full = await db({ action: 'select', table: 'users', match: { id: userId }, select: 'is_admin, department_id, status' });
    if (Array.isArray(full) && full[0]) {
      row = full[0] as ProfileRow;
    } else {
      // Any error response (missing column, RLS block, etc) — retry with
      // only the columns that have existed since day one.
      const minimal = await db({ action: 'select', table: 'users', match: { id: userId }, select: 'is_admin, department_id' });
      if (Array.isArray(minimal) && minimal[0]) {
        row = minimal[0] as ProfileRow;
        if (full && typeof full === 'object' && 'error' in full) {
          // Surface the degraded read so regressions don't slip through
          // silently like they did last time.
          console.warn('[AuthProvider] Falling back to minimal profile select:', (full as { error: string }).error);
        }
      }
    }
    if (!row) return;

    setIsAdmin(row.is_admin === true);
    setDepartmentId(row.department_id ?? null);
    const current: UserStatus = row.status ?? 'active';
    // Backfill path for rows created before the trigger existed: if the
    // email isn't on the org domain and the user isn't an admin, hold them.
    const needsHold = current === 'active'
      && row.is_admin !== true
      && !(email ?? '').toLowerCase().endsWith('@sevenarrowsrecovery.com');
    if (needsHold) {
      setStatus('on_hold');
      db({ action: 'update', table: 'users', data: { status: 'on_hold' }, match: { id: userId } }).catch(() => {});
    } else {
      setStatus(current);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthToken(session?.access_token ?? null);
        if (session?.user) {
          loadProfile(session.user.id, session.user.email ?? null);
          // Supabase fires SIGNED_IN on every session restore (tab open,
          // reload, cross-tab sync) — not just real logins. Dedupe via
          // localStorage: only log once per user per hour.
          if (event === 'SIGNED_IN' && !signInLoggedThisSession) {
            const key = `signin_logged:${session.user.id}`;
            const last = typeof window !== 'undefined' ? Number(window.localStorage.getItem(key) || 0) : 0;
            const now = Date.now();
            if (!last || now - last > 12 * 60 * 60 * 1000) {
              signInLoggedThisSession = true;
              try { window.localStorage.setItem(key, String(now)); } catch { /* ignore */ }
              const meta = session.user.user_metadata || {};
              const name = (meta.full_name as string) || session.user.email || 'User';
              logActivity({
                userId: session.user.id,
                type: 'user.signed_in',
                targetKind: 'user',
                targetId: session.user.id,
                targetLabel: name,
                targetPath: '/app',
              });
            } else {
              signInLoggedThisSession = true;
            }
          }
        } else {
          setIsAdmin(false);
          setDepartmentId(null);
          setStatus('active');
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Presence heartbeat: update last_sign_in + current page + last_seen_at.
  // Runs on mount, on every route change, and on a 60s interval so the
  // Users page can show "viewing /app/calendar • 12s ago".
  useEffect(() => {
    if (!user || !session?.access_token) return;
    const update = () => {
      const now = new Date().toISOString();
      db({
        action: 'update',
        table: 'users',
        data: {
          last_sign_in: now,
          last_seen_at: now,
          last_path: pathname || null,
        },
        match: { id: user.id },
      });
    };
    update();
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, session, pathname]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/app' : undefined,
      },
    });
    if (error) {
      console.error('Auth error:', error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, departmentId, status, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
