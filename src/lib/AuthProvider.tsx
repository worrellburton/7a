'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db, setAuthToken } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  departmentId: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  departmentId: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    const data = await db({ action: 'select', table: 'users', match: { id: userId }, select: 'is_admin, department_id' });
    if (Array.isArray(data) && data[0]) {
      setIsAdmin(data[0].is_admin === true);
      setDepartmentId(data[0].department_id ?? null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthToken(session?.access_token ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthToken(session?.access_token ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setIsAdmin(false);
          setDepartmentId(null);
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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, departmentId, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
