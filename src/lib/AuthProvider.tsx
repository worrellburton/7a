'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  /**
   * Canonical avatar URL for the signed-in user. Reads from the
   * `users.avatar_url` column (which the profile editor writes to) so
   * a member's custom upload sticks even when Google OAuth keeps
   * overwriting `user_metadata.avatar_url` back to their Google photo
   * on each sign-in. Falls back to the OAuth metadata avatar when no
   * custom one has been saved.
   */
  avatarUrl: string | null;
  /** Re-fetch the avatar from `users` (call after a save). */
  refreshAvatar: () => void;
  /**
   * Re-fetch is_admin / department_id / status from `users`. Used by
   * the "Waiting for approval" hold screen to poll the DB so an admin's
   * Approve click unblocks the user without a manual sign-out.
   */
  refreshProfile: () => Promise<void>;
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
  avatarUrl: null,
  refreshAvatar: () => {},
  refreshProfile: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

/**
 * Components anywhere in the tree can dispatch this event after they
 * write a new avatar to `users.avatar_url`; AuthProvider re-fetches
 * the canonical value so every avatar surface (sidebar, drawer, etc.)
 * updates without a reload.
 */
const AVATAR_REFRESH_EVENT = 'auth:refresh-avatar';
export function notifyAvatarChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AVATAR_REFRESH_EVENT));
  }
}

let signInLoggedThisSession = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus>('active');
  // Custom avatar from the users table — separate from
  // user_metadata.avatar_url so Google's OAuth re-sync can't clobber
  // a member's uploaded photo. `null` means use the OAuth fallback.
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  async function loadAvatar(userId: string) {
    const rows = await db({
      action: 'select',
      table: 'users',
      match: { id: userId },
      select: 'avatar_url',
    });
    if (Array.isArray(rows) && rows[0]) {
      const url = (rows[0] as { avatar_url: string | null }).avatar_url;
      setCustomAvatarUrl(typeof url === 'string' && url.length > 0 ? url : null);
    }
  }

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
    // Trust the DB. The status column is set on insert by the
    // `users_set_initial_status` trigger, and admins flip it via the
    // Team page. Don't second-guess that here — an earlier client-side
    // "auto-hold non-org email" backfill kept yanking approved users
    // back to on_hold every time they hit /app, so admin approvals
    // never stuck for Gmail/Yahoo accounts.
    setStatus(row.status ?? 'active');
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? null);
        loadAvatar(session.user.id);
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
          loadAvatar(session.user.id);
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
          setCustomAvatarUrl(null);
        }
        setLoading(false);
      }
    );

    // Listen for in-app avatar updates so every avatar surface
    // re-fetches as soon as the profile editor (or anywhere else) writes
    // a new URL into users.avatar_url.
    const onAvatarRefresh = () => {
      // Read current user via a closure on the latest session.
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) loadAvatar(user.id);
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(AVATAR_REFRESH_EVENT, onAvatarRefresh);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener(AVATAR_REFRESH_EVENT, onAvatarRefresh);
      }
    };
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
    // Always send OAuth completions to the canonical production app,
    // not whichever Vercel preview / custom domain the visitor
    // happens to be on. `NEXT_PUBLIC_SITE_URL` is set to the marketing
    // domain in production (https://www.sevenarrowsrecoveryarizona.com);
    // falls back to the current origin in dev / previews if the env
    // var is missing. The path lands at a server-side callback route
    // that exchanges the code for a session and forwards to /app.
    const canonical =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${canonical}/auth/callback?next=/app`,
      },
    });
    if (error) {
      console.error('Auth error:', error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // The visible avatar prefers the user's own upload (custom column)
  // and falls back to whatever Google/OAuth provided. `null` means
  // render the initial-letter placeholder.
  const avatarUrl =
    customAvatarUrl || ((user?.user_metadata?.avatar_url as string | undefined) ?? null);

  const refreshAvatar = () => {
    if (user?.id) loadAvatar(user.id);
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadProfile(user.id, user.email ?? null);
  }, [user?.id, user?.email]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        departmentId,
        status,
        avatarUrl,
        refreshAvatar,
        refreshProfile,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
