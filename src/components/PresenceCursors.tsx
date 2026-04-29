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
  color: string | null; // user-chosen hex/HSL; falls back to hue
  x: number; // viewport-relative px
  y: number;
  vw: number; // sender viewport size for proportional placement
  vh: number;
  path: string;
  ts: number;
}

interface RemoteCursor extends CursorPayload {
  // Stable hue derived from id hash, used when no explicit color is set.
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
  const profileRef = useRef<{ name: string; avatar_url: string | null; color: string | null } | null>(null);

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
        select: 'full_name, avatar_url, cursor_color',
      }).catch(() => null);
      if (cancelled) return;
      const meta = user.user_metadata || {};
      const fallbackName = (meta.full_name as string) || user.email || 'User';
      const fallbackAvatar = (meta.avatar_url as string) || null;
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0] as { full_name: string | null; avatar_url: string | null; cursor_color: string | null };
        profileRef.current = {
          name: r.full_name || fallbackName,
          avatar_url: r.avatar_url || fallbackAvatar,
          color: r.cursor_color || null,
        };
      } else {
        profileRef.current = { name: fallbackName, avatar_url: fallbackAvatar, color: null };
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Listen for in-app color changes (broadcast from the profile page) so we
  // pick up new colors without a reload.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ color: string | null }>).detail;
      if (profileRef.current) profileRef.current.color = detail?.color ?? null;
    };
    window.addEventListener('cursor-color-change', onChange);
    return () => window.removeEventListener('cursor-color-change', onChange);
  }, []);

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
          color: profile.color,
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
    <div className="hidden lg:block fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {/* Local keyframes for the cursor flame trail. Two complementary
          loops on the flame element: a vertical "flicker" (scaleY +
          slight rotate) and a horizontal "wave" (skewX + translate),
          phased so the flame never freezes into a static blob. */}
      <style jsx>{`
        @keyframes presence-flame-flicker {
          0%, 100% { transform: scaleY(1) scaleX(0.95); opacity: 0.85; }
          25% { transform: scaleY(1.15) scaleX(0.9); opacity: 1; }
          50% { transform: scaleY(0.92) scaleX(1.05); opacity: 0.7; }
          75% { transform: scaleY(1.08) scaleX(0.93); opacity: 0.95; }
        }
        @keyframes presence-flame-sway {
          0%, 100% { transform: translateX(-50%) skewX(-4deg); }
          50% { transform: translateX(-50%) skewX(4deg); }
        }
        @keyframes presence-glow-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
      `}</style>

      {visible.map((c) => {
        // Rescale to current viewport so cursors land in roughly the same
        // visual location even when viewport sizes differ between clients.
        const x = (c.x / Math.max(1, c.vw)) * viewport.w;
        const y = (c.y / Math.max(1, c.vh)) * viewport.h;
        const initial = (c.name || '?').charAt(0).toUpperCase();
        const color = c.color || `hsl(${c.hue}, 70%, 50%)`;
        return (
          <div
            key={c.user_id}
            className="absolute top-0 left-0 will-change-transform transition-transform duration-75 ease-linear"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            {/* Fire trail — sits BEHIND the cursor arrow. A radial
                glow sets the heat halo, then a flame teardrop
                streams downward from the cursor tip with a flicker
                + sway loop. The flame's gradient runs from the
                cursor's color at the tip → orange in the middle →
                bright yellow at the base, so even when the user's
                color is purple/blue, the trail still reads as "fire". */}
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                top: 14,
                left: 8,
                width: 28,
                height: 60,
                transform: 'translateX(-50%)',
                animation: 'presence-flame-sway 1.4s ease-in-out infinite',
                filter: 'blur(0.4px)',
              }}
            >
              {/* Outer glow halo — pulses gently so the cursor reads
                  as alive even when the user is idle. */}
              <span
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(closest-side, ${color}aa 0%, ${color}66 35%, transparent 75%)`,
                  filter: 'blur(8px)',
                  animation: 'presence-glow-pulse 1.8s ease-in-out infinite',
                }}
              />
              {/* Flame body — teardrop with a fire gradient. The
                  flicker loop scales it up/down so it dances. */}
              <span
                className="absolute"
                style={{
                  left: '50%',
                  top: 6,
                  width: 20,
                  height: 50,
                  marginLeft: -10,
                  borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
                  background: `linear-gradient(to bottom, ${color} 0%, #f97316 38%, #fbbf24 78%, #fde68a 100%)`,
                  transformOrigin: '50% 0%',
                  animation: 'presence-flame-flicker 0.85s ease-in-out infinite',
                  filter: 'blur(0.6px)',
                  mixBlendMode: 'screen',
                }}
              />
            </div>

            {/* Cursor arrow — sits above the flame so the pointer
                tip is always crisp. drop-shadow keeps it readable
                on light backgrounds; the wider colored shadow adds
                a subtle outer halo so the cursor glows even before
                the flame catches up. */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="relative drop-shadow-md"
              style={{
                color,
                filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`,
              }}
            >
              <path
                d="M3 2 L17 9 L10 11 L8 17 Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Avatar — explicit width/height + aspect-square + the
                inline w/h attributes guarantee a perfect circle even
                when the source image is non-square (the old version
                rendered as an oval whenever a portrait avatar landed
                here because object-fit was unset). The colored
                box-shadow wraps the disc with the user's cursor
                color so each teammate's avatar is identifiable at a
                glance, plus a soft outer glow that ties into the
                flame. */}
            {c.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.avatar_url}
                alt=""
                width={24}
                height={24}
                className="absolute top-4 left-4 rounded-full object-cover aspect-square"
                style={{
                  width: 24,
                  height: 24,
                  boxShadow: `0 0 0 2px ${color}, 0 0 10px ${color}aa`,
                }}
              />
            ) : (
              <div
                className="absolute top-4 left-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center aspect-square"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: color,
                  boxShadow: `0 0 0 2px #ffffff, 0 0 10px ${color}aa`,
                }}
              >
                {initial}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
