'use client';

// Shows avatar chips of other signed-in users currently viewing the same
// page. Polls the users table every 30s. Mounted once in PlatformShell so
// every `/app/*` route inherits the behaviour without needing per-page code.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';

interface Viewer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  last_seen_at: string | null;
  last_path: string | null;
}

// Consider a user "here" if seen in the last 3 minutes and on this exact path.
const HERE_WINDOW_MS = 3 * 60 * 1000;

export default function PageViewers() {
  const { user, session } = useAuth();
  const pathname = usePathname();
  const [viewers, setViewers] = useState<Viewer[]>([]);

  useEffect(() => {
    if (!user || !session?.access_token || !pathname) return;

    let cancelled = false;

    async function load() {
      const data = await db({
        action: 'select',
        table: 'users',
        select: 'id, full_name, avatar_url, job_title, last_seen_at, last_path',
      });
      if (cancelled || !Array.isArray(data)) return;
      const now = Date.now();
      const here = (data as Viewer[]).filter((u) => {
        if (!user || u.id === user.id) return false;
        if (u.last_path !== pathname) return false;
        if (!u.last_seen_at) return false;
        return now - new Date(u.last_seen_at).getTime() < HERE_WINDOW_MS;
      });
      setViewers(here);
    }

    load();
    const interval = setInterval(load, 30 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, session, pathname]);

  if (viewers.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 lg:left-[calc(50%+8rem)] -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#2a2118]/90 backdrop-blur border border-gray-100 dark:border-white/10 shadow-sm">
      <span
        className="text-[10px] font-semibold text-foreground/70 dark:text-white/80 uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Also here
      </span>
      <div className="flex -space-x-1.5">
        {viewers.slice(0, 5).map((u) => (
          <div key={u.id} className="relative group">
            {u.avatar_url ? (
              <img
                src={u.avatar_url}
                alt={u.full_name || ''}
                className="w-6 h-6 rounded-full border-2 border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] hover:scale-110 hover:z-10 transition-transform"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] bg-primary text-white flex items-center justify-center text-[10px] font-bold hover:scale-110 hover:z-10 transition-transform">
                {(u.full_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <p className="font-medium">{u.full_name || 'User'}</p>
              {u.job_title && <p className="text-white/70 text-[10px]">{u.job_title}</p>}
              <p className="text-emerald-300 text-[10px]">Viewing this page</p>
            </div>
          </div>
        ))}
        {viewers.length > 5 && (
          <div className="w-6 h-6 rounded-full border-2 border-white bg-foreground text-white flex items-center justify-center text-[9px] font-bold">
            +{viewers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
