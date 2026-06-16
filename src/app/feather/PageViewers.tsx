'use client';

// Shows avatar chips of other signed-in users currently viewing the
// same page. Mounted once in PlatformShell so every `/feather/*` route
// inherits the behaviour.
//
// Previously this downloaded the entire users table every 30s on
// every route, then filtered client-side — the worst recurring
// PostgREST egress in the app. Now the query is fully scoped
// server-side (same path, active, seen in the last 3 minutes), so
// each poll returns at most a handful of rows, and the
// avatar_thumb column is preferred over avatar_url so we don't
// download 200×200 originals just to draw 24×24 chips.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toAvatarThumb } from '@/lib/avatarThumb';

interface Viewer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_thumb: string | null;
  job_title: string | null;
  last_seen_at: string | null;
  last_path: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
}

// Consider a user "here" if seen in the last 3 minutes and on this exact path.
const HERE_WINDOW_MS = 3 * 60 * 1000;

export default function PageViewers() {
  const { user, session, userKind } = useAuth();
  const pathname = usePathname();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  // The pill is fixed to the viewport but should read as centered within
  // the content area, which sits to the right of the sidebar. The nudge
  // is half the reserved sidebar width: 2rem for the collapsed w-16 rail
  // on inner pages, 8rem on the home screen where the rail is pinned open
  // at w-64 (see PlatformShell's railPinnedOpen).
  const railPinnedOpen = pathname === (userKind === 'alumni' ? '/feather/alumni' : '/feather');

  useEffect(() => {
    if (!user || !session?.access_token || !pathname) return;

    let cancelled = false;

    async function load() {
      const since = new Date(Date.now() - HERE_WINDOW_MS).toISOString();
      const { data } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, avatar_thumb, job_title, last_seen_at, last_path, status')
        .eq('last_path', pathname)
        .gte('last_seen_at', since)
        // `status` is null on legacy rows but the policy treats null
        // as active, so we filter for null OR active rather than
        // excluding nulls outright.
        .or('status.is.null,status.eq.active')
        .neq('id', user!.id)
        .limit(50);
      if (cancelled || !Array.isArray(data)) return;
      setViewers(data as Viewer[]);
    }

    void load();
    const interval = setInterval(load, 30 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, session, pathname]);

  if (viewers.length === 0) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 ${railPinnedOpen ? 'lg:left-[calc(50%+8rem)]' : 'lg:left-[calc(50%+2rem)]'} -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-gray-100 shadow-sm`}>
      <span
        className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Also here
      </span>
      <div className="flex -space-x-1.5">
        {viewers.slice(0, 5).map((u) => {
          // Prefer the inlined 60×60 WebP thumb when populated; only
          // fall back to the (potentially full-res) avatar_url path
          // through toAvatarThumb for legacy rows.
          const src = u.avatar_thumb ?? (u.avatar_url ? toAvatarThumb(u.avatar_url, 200) ?? u.avatar_url : null);
          return (
            <div key={u.id} className="relative group">
              {src ? (
                <img
                  src={src}
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
          );
        })}
        {viewers.length > 5 && (
          <div className="w-6 h-6 rounded-full border-2 border-white bg-foreground text-white flex items-center justify-center text-[9px] font-bold">
            +{viewers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
