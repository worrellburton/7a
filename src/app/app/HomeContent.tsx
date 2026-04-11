'use client';

import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { useEffect, useMemo, useState } from 'react';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  job_title: string | null;
  last_path: string | null;
  last_seen_at: string | null;
}

function isOnlineNow(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 6 * 60 * 1000;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomeContent() {
  const { user, session } = useAuth();
  const { pages } = usePagePermissions();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Map /app/... path → friendly label ("Calendar", "Org Chart", etc.)
  const pathLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pages) map.set(p.path, p.label);
    map.set('/app/profile', 'My Profile');
    return (path: string | null): string | null => {
      if (!path) return null;
      if (map.has(path)) return map.get(path)!;
      // Fall back to last segment if it's a nested route we don't know
      const last = path.split('/').filter(Boolean).pop();
      if (!last) return null;
      return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };
  }, [pages]);

  useEffect(() => {
    if (!session?.access_token) return;
    async function fetchRecentUsers() {
      const data = await db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url, last_sign_in, last_seen_at, last_path, job_title', order: { column: 'last_sign_in', ascending: false } });
      if (Array.isArray(data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setRecentUsers(data.filter((u: RecentUser) => u.last_sign_in && new Date(u.last_sign_in) >= today));
      }
      setTimeout(() => setLoaded(true), 100);
    }
    fetchRecentUsers();
  }, [session]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Centered welcome */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'there'}
        </h1>
      </div>

      {/* Active today bar — pinned to bottom, slides up */}
      {recentUsers.length > 0 && (
        <div
          className={`flex items-center gap-3 px-6 lg:px-10 pb-6 transition-all duration-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider mr-1" style={{ fontFamily: 'var(--font-body)' }}>
            Active today
          </span>
          <div className="flex -space-x-2">
            {recentUsers.map((u) => {
              const online = isOnlineNow(u.last_seen_at || u.last_sign_in);
              const viewing = online ? pathLabel(u.last_path) : null;
              return (
                <div key={u.id} className="relative group">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.full_name || ''}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 hover:z-10 ${
                        online ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'border-white'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 hover:z-10 ${
                        online ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] bg-primary text-white' : 'border-white bg-primary text-white'
                      }`}
                    >
                      {(u.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <p className="font-medium">{u.full_name || 'User'}</p>
                    {u.job_title && <p className="text-white/80">{u.job_title}</p>}
                    <p className="text-white/60">{online ? 'Online now' : `Last active ${timeAgo(u.last_sign_in)}`}</p>
                    {viewing && <p className="text-emerald-300">Viewing {viewing}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
