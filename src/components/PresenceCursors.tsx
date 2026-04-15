'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// Realtime cursor presence layer.
//
// Each signed-in user broadcasts their viewport mouse position over a single
// Supabase Realtime channel. Every client renders the cursors of OTHER users
// who are currently on the SAME pathname (so my Calendar page only shows
// cursors of teammates also on Calendar). We use `broadcast` (not `presence`)
// because we only care about the high-frequency position stream — cursors fade
// out automatically after STALE_MS without an update.

interface CursorPayload {
  user_id: string;
  name: string;
  avatar_url: string | null;
  x: number; // viewport-relative px
  y: number;
  vw: number; // sender viewport size for proportional placement
  vh: number;
  path: string;
  ts: number;
}

interface RemoteCursor extends CursorPayload {
  // Stable color per user, derived from id hash.
  hue: number;
}

const CHANNEL = 'presence-cursors';
const THROTTLE_MS = 40; // ~25 fps
const STALE_MS = 4000;

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function PresenceCursors() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);
  // Cache the freshest profile for the current user — pulled from the `users`
  // table so we get the same avatar/name everyone else sees, not just whatever
  // happens to be in the auth metadata.
  const profileRef = useRef<{ name: string; avatar_url: string | null } | null>(null);

  // Track viewport for proportional rescaling of remote cursors.
  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Load my own profile once so broadcasts carry the canonical avatar/name.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const rows = await db({
        action: 'select',
        table: 'users',
        match: { id: user.id },
        select: 'full_name, avatar_url',
      }).catch(() => null);
      if (cancelled) return;
      const meta = user.user_metadata || {};
      const fallbackName = (meta.full_name as string) || user.email || 'User';
      const fallbackAvatar = (meta.avatar_url as string) || null;
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0] as { full_name: string | null; avatar_url: string | null };
        profileRef.current = {
          name: r.full_name || fallbackName,
          avatar_url: r.avatar_url || fallbackAvatar,
        };
      } else {
        profileRef.current = { name: fallbackName, avatar_url: fallbackAvatar };
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Subscribe to the channel and clean up stale cursors every second.
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'cursor' }, (msg) => {
      const c = msg.payload as CursorPayload;
      if (!c || c.user_id === user.id) return;
      setCursors((prev) => ({
        ...prev,
        [c.user_id]: { ...c, ts: Date.now(), hue: hueFromId(c.user_id) },
      }));
    });

    ch.on('broadcast', { event: 'leave' }, (msg) => {
      const id = (msg.payload as { user_id: string } | undefined)?.user_id;
      if (!id) return;
      setCursors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    ch.subscribe();

    const sweep = window.setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      setCursors((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.ts >= cutoff) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);

    const onUnload = () => {
      try {
        ch.send({ type: 'broadcast', event: 'leave', payload: { user_id: user.id } });
      } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.clearInterval(sweep);
      window.removeEventListener('beforeunload', onUnload);
      onUnload();
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [user?.id]);

  // Throttled mousemove broadcaster.
  useEffect(() => {
    if (!user?.id) return;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSentRef.current < THROTTLE_MS) return;
      lastSentRef.current = now;
      const ch = channelRef.current;
      const profile = profileRef.current;
      if (!ch || !profile) return;
      ch.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          user_id: user.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          x: e.clientX,
          y: e.clientY,
          vw: window.innerWidth,
          vh: window.innerHeight,
          path: pathname || '/',
          ts: now,
        } as CursorPayload,
      });
    };
    // Also send a "leave" when path changes so old-page cursors disappear
    // immediately for everyone.
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [user?.id, pathname]);

  if (!user || viewport.w === 0) return null;

  // Only show cursors of teammates currently on the same page.
  const visible = Object.values(cursors).filter((c) => c.path === pathname);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {visible.map((c) => {
        // Rescale to current viewport so cursors land in roughly the same
        // visual location even when viewport sizes differ between clients.
        const x = (c.x / Math.max(1, c.vw)) * viewport.w;
        const y = (c.y / Math.max(1, c.vh)) * viewport.h;
        const initial = (c.name || '?').charAt(0).toUpperCase();
        const color = `hsl(${c.hue}, 70%, 50%)`;
        return (
          <div
            key={c.user_id}
            className="absolute top-0 left-0 will-change-transform transition-transform duration-75 ease-linear"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="drop-shadow-md"
              style={{ color }}
            >
              <path
                d="M3 2 L17 9 L10 11 L8 17 Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Avatar + name pill */}
            <div
              className="absolute top-4 left-4 flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full shadow-md whitespace-nowrap text-white"
              style={{ backgroundColor: color, fontFamily: 'var(--font-body)' }}
            >
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full ring-1 ring-white/70"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/30 text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white/70">
                  {initial}
                </div>
              )}
              <span className="text-[10px] font-semibold leading-none">
                {c.name.split(' ')[0]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
