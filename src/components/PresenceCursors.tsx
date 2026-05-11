'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import {
  type CursorEffectId,
  DEFAULT_CURSOR_EFFECT,
  normaliseCursorEffect,
} from '@/lib/cursor-effects';

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
  // User-picked render mode from the cursor-effect catalogue. Optional
  // on the wire so a sender on an old build (pre-phase 8) doesn't
  // crash receivers on the new build — receivers normalise to
  // 'classic' when the field is missing or unrecognised.
  effect?: CursorEffectId;
  // DOCUMENT-relative coordinates (pageX / pageY = clientX/Y + scrollX/Y),
  // not viewport-relative. Sender includes scroll position so receivers
  // can anchor cursors to where the sender was actually pointing in the
  // document — when either side scrolls, the cursor stays glued to the
  // content under the sender's mouse, not at the same screen position.
  x: number;
  y: number;
  vw: number; // sender's document width (was viewport width pre-fix);
  vh: number; // kept as `vw/vh` on the wire for forward/backward compat.
  path: string;
  ts: number;
}

interface TrailPoint {
  x: number;
  y: number;
  ts: number;
}

interface RemoteCursor extends CursorPayload {
  // Stable hue derived from id hash, used when no explicit color is set.
  hue: number;
  // Always present locally — either the sender's broadcast or the
  // 'classic' default if the wire payload omitted the field.
  effectId: CursorEffectId;
  // Velocity bookkeeping — populated locally on every broadcast we
  // receive. The fire trail orientation + length are computed from
  // these. Only the latest (vx, vy, speed) values are read by
  // render; prevX/prevY/prevTs are bookkeeping for the next delta.
  prevX?: number;
  prevY?: number;
  prevTs?: number;
  /** Smoothed velocity in px/sec along x/y. Smoothed via EMA so the
   *  trail direction doesn't flicker between every two frames. */
  vx?: number;
  vy?: number;
  /** Smoothed speed magnitude in px/sec. Drives flame length. */
  speed?: number;
  /** Ring buffer of recent (x, y, ts) so the multi-particle trail
   *  can render fading copies along the actual path the cursor
   *  took, not just along the current velocity direction. */
  trail?: TrailPoint[];
}

const TRAIL_LENGTH = 8;
const TRAIL_LIFETIME_MS = 600;

const CHANNEL = 'presence-cursors';
const THROTTLE_MS = 40; // ~25 fps
const STALE_MS = 4000;

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

const SHOW_CURSORS_STORAGE_KEY = 'sa-show-other-cursors';

export function PresenceCursors() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  // Per-user toggle from the account popup in PlatformShell. When off,
  // we still broadcast (so other users can see this cursor) but we
  // don't paint anyone else's. Listens for the same CustomEvent the
  // toggle dispatches so flipping it updates the renderer instantly.
  const [showOthers, setShowOthers] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SHOW_CURSORS_STORAGE_KEY) !== 'off';
  });
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ on?: boolean }>).detail;
      if (typeof detail?.on === 'boolean') setShowOthers(detail.on);
    };
    window.addEventListener('show-cursors-change', onChange);
    return () => window.removeEventListener('show-cursors-change', onChange);
  }, []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);
  // Cache the freshest profile for the current user — pulled from the `users`
  // table so we get the same avatar/name everyone else sees, not just whatever
  // happens to be in the auth metadata.
  const profileRef = useRef<{ name: string; avatar_url: string | null; color: string | null; effect: CursorEffectId } | null>(null);

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
      // Try the FULL select first (includes cursor_effect, added in
      // migration 20260508_users_cursor_effect.sql). If that fails on
      // a stack that hasn't applied the migration, fall back to the
      // pre-effect select so the cursor layer keeps rendering with
      // 'classic' instead of going silent. This mirrors the same
      // safe-degrade pattern used on the profile page itself.
      let rows = await db({
        action: 'select',
        table: 'users',
        match: { id: user.id },
        select: 'full_name, avatar_url, cursor_color, cursor_effect',
      }).catch(() => null);
      if (!Array.isArray(rows)) {
        // eslint-disable-next-line no-console
        console.info('[PresenceCursors] cursor_effect column unavailable; using classic.');
        rows = await db({
          action: 'select',
          table: 'users',
          match: { id: user.id },
          select: 'full_name, avatar_url, cursor_color',
        }).catch(() => null);
      }
      if (cancelled) return;
      const meta = user.user_metadata || {};
      const fallbackName = (meta.full_name as string) || user.email || 'User';
      const fallbackAvatar = (meta.avatar_url as string) || null;
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0] as {
          full_name: string | null;
          avatar_url: string | null;
          cursor_color: string | null;
          cursor_effect?: string | null;
        };
        profileRef.current = {
          name: r.full_name || fallbackName,
          avatar_url: r.avatar_url || fallbackAvatar,
          color: r.cursor_color || null,
          effect: normaliseCursorEffect(r.cursor_effect),
        };
      } else {
        profileRef.current = {
          name: fallbackName,
          avatar_url: fallbackAvatar,
          color: null,
          effect: DEFAULT_CURSOR_EFFECT,
        };
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

  // Same pattern for cursor_effect — the picker on /app/profile fires
  // a 'cursor-effect-change' CustomEvent so the new effect ships in
  // the very next outgoing broadcast (no reload, no waiting for the
  // db round-trip).
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ effect: CursorEffectId | string | null }>).detail;
      if (profileRef.current) {
        profileRef.current.effect = normaliseCursorEffect(detail?.effect ?? null);
      }
    };
    window.addEventListener('cursor-effect-change', onChange);
    return () => window.removeEventListener('cursor-effect-change', onChange);
  }, []);

  // Subscribe to the channel and clean up stale cursors every second.
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'cursor' }, (msg) => {
      const c = msg.payload as CursorPayload;
      if (!c || c.user_id === user.id) return;
      const arrivedAt = Date.now();
      setCursors((prev) => {
        const previous = prev[c.user_id];
        // Compute instantaneous velocity from the last known
        // position. Skip when there's no prior point or the path
        // changed (cursor jumped to another page — that's not real
        // movement, don't infer a 5000px/s spike from it).
        let prevX: number | undefined = previous?.x;
        let prevY: number | undefined = previous?.y;
        let prevTs: number | undefined = previous?.ts;
        if (previous && previous.path !== c.path) {
          prevX = undefined;
          prevY = undefined;
          prevTs = undefined;
        }

        let instVx = 0;
        let instVy = 0;
        if (prevX != null && prevY != null && prevTs != null) {
          const dtSec = Math.max(0.001, (arrivedAt - prevTs) / 1000);
          instVx = (c.x - prevX) / dtSec;
          instVy = (c.y - prevY) / dtSec;
        }

        // EMA smoothing — broadcasts come in at ~25 fps so raw
        // frame-to-frame velocity wobbles wildly even on smooth
        // pointer motion. Blend ~30% of the new sample into the
        // previous smoothed value so the trail direction settles
        // visibly instead of jittering. The constant is calibrated
        // to feel responsive on flicks but stable while drawing
        // straight lines.
        const ALPHA = 0.3;
        const prevVx = previous?.vx ?? 0;
        const prevVy = previous?.vy ?? 0;
        const smoothedVx = prevVx * (1 - ALPHA) + instVx * ALPHA;
        const smoothedVy = prevVy * (1 - ALPHA) + instVy * ALPHA;

        // Append to trail ring buffer — keep the last TRAIL_LENGTH
        // points or anything younger than TRAIL_LIFETIME_MS,
        // whichever is shorter. On a path change we wipe the trail
        // because the cursor effectively teleported.
        const oldTrail = previous?.path === c.path ? (previous.trail ?? []) : [];
        const cutoff = arrivedAt - TRAIL_LIFETIME_MS;
        const trimmed = oldTrail.filter((p) => p.ts >= cutoff);
        const nextTrail: TrailPoint[] = [
          ...trimmed,
          { x: c.x, y: c.y, ts: arrivedAt },
        ].slice(-TRAIL_LENGTH);

        return {
          ...prev,
          [c.user_id]: {
            ...c,
            ts: arrivedAt,
            hue: hueFromId(c.user_id),
            // Coerce the wire value through the catalogue so a stale
            // effect id (sender on a newer build that widened the
            // catalogue, or a missing field from a pre-phase-8
            // sender) renders as 'classic' instead of an undefined
            // branch.
            effectId: normaliseCursorEffect(c.effect),
            prevX: c.x,
            prevY: c.y,
            prevTs: arrivedAt,
            vx: smoothedVx,
            vy: smoothedVy,
            speed: Math.hypot(smoothedVx, smoothedVy),
            trail: nextTrail,
          },
        };
      });
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
          effect: profile.effect,
          // pageX/pageY = clientX/Y + scrollX/Y. Document-relative so
          // receivers can anchor the cursor to the same content the
          // sender is hovering over, regardless of either side's
          // scroll position.
          x: e.pageX,
          y: e.pageY,
          // Document dimensions, not viewport. Lets receivers do
          // proportional scaling when document widths differ (rare on
          // a shared CRM page but cheap insurance).
          vw: document.documentElement.scrollWidth,
          vh: document.documentElement.scrollHeight,
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

  // Time-based effects (sparkle / rainbow / pulse / glow / bubbles)
  // need a steady ~60fps tick to repaint between broadcasts. Trail-
  // based effects (flame / comet / lightning / dots) animate
  // implicitly through the trail buffer + incoming broadcasts. We
  // gate the rAF loop on cursor presence so an empty page doesn't
  // burn a frame budget for nothing.
  const [, setNow] = useState(0);
  const hasCursors = Object.keys(cursors).length > 0;
  useEffect(() => {
    if (!hasCursors) return;
    let raf = 0;
    const loop = () => {
      setNow((n) => (n + 1) % 1_000_000);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [hasCursors]);

  if (!user || viewport.w === 0) return null;
  // Per-user opt-out lives in localStorage (toggled from the account
  // popup in PlatformShell). When off, we render the broadcasting
  // wrapper as nothing — outgoing broadcasts still fire so other
  // people can see THIS user, just we don't paint theirs.
  if (!showOthers) return null;

  // Only show cursors of teammates currently on the same page.
  const visible = Object.values(cursors).filter((c) => c.path === pathname);

  return (
    <div className="hidden lg:block absolute inset-0 pointer-events-none z-[200]">
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
        /* glow effect — slow inhale / exhale on the halo, no
           flame body. */
        @keyframes presence-effect-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
          50%      { transform: translate(-50%, -50%) scale(1.18); opacity: 0.85; }
        }
        /* pulse effect — rings spawn at the cursor and expand
           outward, fading as they grow. Two ring tracks phased
           half a cycle apart so there's always one mid-flight. */
        @keyframes presence-effect-ring {
          0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(1.6);  opacity: 0; }
        }
      `}</style>

      {visible.map((c) => {
        // x / y are document-relative (pageX / pageY) and we render inside
        // an `absolute inset-0` container that's anchored at the document
        // origin, so the raw values position the cursor over the same
        // content the sender was hovering — even when either side has
        // scrolled. No viewport rescaling: on a shared CRM page the
        // document layout is the same for everyone.
        const x = c.x;
        const y = c.y;
        const initial = (c.name || '?').charAt(0).toUpperCase();
        const baseColor = c.color || `hsl(${c.hue}, 70%, 50%)`;

        // Rainbow effect overrides the chosen colour with a hue-cycling
        // value sampled off Date.now(). The user explicitly opted into
        // multi-hue when they picked rainbow, so we own the colour
        // channel for them. All other effects honour the chosen colour.
        const color = c.effectId === 'rainbow'
          ? `hsl(${(Date.now() / 22) % 360}, 85%, 58%)`
          : baseColor;

        // Trail orientation. Flame drags OPPOSITE to motion, so we
        // negate the velocity vector and atan2 it to get the angle
        // pointing away from the cursor.
        const speed = c.speed ?? 0;
        const IDLE_SPEED = 25;
        const trailAngleDeg = speed >= IDLE_SPEED
          ? (Math.atan2(-(c.vx ?? 0), -(c.vy ?? 0)) * 180) / Math.PI
          : 0;

        const SPEED_REF = 1400;
        const speedNorm = Math.min(1, speed / SPEED_REF);
        const lengthScale = 0.45 + speedNorm * 2.15;
        const widthScale = 0.85 + speedNorm * 0.40;

        // Pre-compute trail points in the cursor's own translated
        // frame so each effect renderer can iterate them without
        // repeating the (px - x, py - y) math.
        const trailPts = (c.trail ?? []).slice(0, -1).map((pt, i, arr) => {
          const ageMs = c.ts - pt.ts;
          const ageNorm = Math.max(0, Math.min(1, ageMs / TRAIL_LIFETIME_MS));
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          return { ts: pt.ts, dx: pt.x - x, dy: pt.y - y, ageNorm, indexNorm };
        });

        // Per-effect decoration — sits BEHIND the cursor arrow.
        // Each branch renders its own JSX off the same shared
        // (color, x, y, trailPts, speed*) inputs. classic returns
        // null because the bare arrow + avatar IS the effect.
        let decoration: React.ReactNode = null;

        if (c.effectId === 'flame') {
          // Multi-particle fire trail behind the cursor (the original
          // PresenceCursors look) — heat-graded radial gradients along
          // the path + a teardrop flame body that flickers and stretches
          // with speed.
          decoration = (
            <>
              {trailPts.map(({ ts, dx, dy, ageNorm, indexNorm }) => {
                const alpha = (1 - ageNorm) * indexNorm * 0.7;
                const size = 6 + indexNorm * 8 + speedNorm * 4;
                const heat = indexNorm;
                const core = heat > 0.66 ? '#ffffff' : heat > 0.33 ? '#fde68a' : '#f97316';
                const mid  = heat > 0.66 ? '#fde68a' : heat > 0.33 ? '#fbbf24' : '#dc2626';
                const edge = heat > 0.5  ? color     : '#7c2d12';
                return (
                  <span
                    key={ts}
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: dx,
                      top: dy,
                      width: size,
                      height: size,
                      transform: 'translate(-50%, -50%)',
                      background: `radial-gradient(circle, ${core} 0%, ${mid} 35%, ${edge} 70%, transparent 100%)`,
                      opacity: alpha,
                      filter: `blur(${1.5 + indexNorm * 1.5}px)`,
                      mixBlendMode: 'screen',
                    }}
                  />
                );
              })}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: 4,
                  left: 4,
                  width: 28,
                  height: 60,
                  transformOrigin: '50% 0%',
                  transform: `translateX(-50%) rotate(${trailAngleDeg}deg)`,
                  transition: 'transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <div
                  className="relative w-full h-full"
                  style={{
                    animation: 'presence-flame-sway 1.4s ease-in-out infinite',
                    filter: 'blur(0.4px)',
                  }}
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(closest-side, ${color}aa 0%, ${color}66 35%, transparent 75%)`,
                      filter: 'blur(8px)',
                      animation: 'presence-glow-pulse 1.8s ease-in-out infinite',
                    }}
                  />
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
                      scale: `${widthScale} ${lengthScale}`,
                      transition: 'scale 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                      animation: 'presence-flame-flicker 0.85s ease-in-out infinite',
                      filter: 'blur(0.6px)',
                      mixBlendMode: 'screen',
                    }}
                  />
                </div>
              </div>
            </>
          );
        } else if (c.effectId === 'comet') {
          // Tapered solid tail — chooses the user's colour and lets
          // the indexNorm/ageNorm decide size + alpha. No glow, no
          // flame body; the line of soft circles reads as a comet's
          // wake on its own.
          decoration = (
            <>
              {trailPts.map(({ ts, dx, dy, ageNorm, indexNorm }) => {
                const size = 4 + indexNorm * 12;
                const alpha = (1 - ageNorm) * indexNorm * 0.65;
                return (
                  <span
                    key={ts}
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: dx,
                      top: dy,
                      width: size,
                      height: size,
                      transform: 'translate(-50%, -50%)',
                      background: color,
                      opacity: alpha,
                      filter: 'blur(1.5px)',
                    }}
                  />
                );
              })}
            </>
          );
        } else if (c.effectId === 'lightning') {
          // Zigzag short tail — alternating ±skew on each segment so
          // the path reads as a jagged bolt rather than a smooth line.
          decoration = (
            <>
              {trailPts.map(({ ts, dx, dy, indexNorm }, i) => {
                const skew = i % 2 === 0 ? -4 : 4;
                const alpha = indexNorm * 0.85;
                return (
                  <span
                    key={ts}
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{
                      left: dx + skew,
                      top: dy + skew,
                      width: 8,
                      height: 2.5,
                      transform: 'translate(-50%, -50%)',
                      background: color,
                      opacity: alpha,
                      borderRadius: 2,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                );
              })}
            </>
          );
        } else if (c.effectId === 'dots') {
          // Plain fading-circle trail — no glow, no zigzag, just
          // discrete colour dots that age out behind the cursor.
          decoration = (
            <>
              {trailPts.map(({ ts, dx, dy, ageNorm, indexNorm }) => {
                const size = 4 + indexNorm * 4;
                const alpha = (1 - ageNorm) * indexNorm * 0.6;
                return (
                  <span
                    key={ts}
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: dx,
                      top: dy,
                      width: size,
                      height: size,
                      transform: 'translate(-50%, -50%)',
                      background: color,
                      opacity: alpha,
                    }}
                  />
                );
              })}
            </>
          );
        } else if (c.effectId === 'sparkle') {
          // Four sparkles orbiting the cursor head. Phase off
          // Date.now() so they pulse in/out and rotate slowly. The
          // rAF tick at the component root forces a repaint on every
          // frame so the orbit is smooth without per-cursor raf
          // bookkeeping.
          const t = Date.now() / 380;
          const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          decoration = (
            <>
              {angles.map((a, i) => {
                const radius = 14 + Math.sin(t + i) * 4;
                const dx = Math.cos(a + t * 0.4) * radius;
                const dy = Math.sin(a + t * 0.4) * radius;
                const alpha = 0.5 + 0.5 * Math.sin(t * 1.5 + i);
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: dx,
                      top: dy,
                      width: 6,
                      height: 6,
                      transform: 'translate(-50%, -50%)',
                      background: color,
                      opacity: alpha,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                );
              })}
            </>
          );
        } else if (c.effectId === 'bubbles') {
          // Bubbles rise upward from each historical trail point.
          // Vertical offset is age-based so they actually drift up
          // as time passes; horizontal wobble alternates so the
          // column doesn't read as a perfectly straight stream.
          const now = Date.now();
          decoration = (
            <>
              {trailPts.map(({ ts, dx, dy }, i) => {
                const ageSec = (now - ts) / 1000;
                if (ageSec > 1.5) return null;
                const rise = ageSec * 28;
                const wobble = Math.sin(ageSec * 6 + i) * 5;
                const size = 6 + ageSec * 6;
                const alpha = Math.max(0, (1 - ageSec / 1.5)) * 0.55;
                return (
                  <span
                    key={ts}
                    aria-hidden="true"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: dx + wobble,
                      top: dy - rise,
                      width: size,
                      height: size,
                      transform: 'translate(-50%, -50%)',
                      background: color,
                      opacity: alpha,
                      boxShadow: `inset 0 0 4px rgba(255,255,255,0.5)`,
                    }}
                  />
                );
              })}
            </>
          );
        } else if (c.effectId === 'glow') {
          // Single soft halo behind the cursor that inhales /
          // exhales via the presence-effect-glow keyframes.
          decoration = (
            <span
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: 4,
                top: 4,
                width: 60,
                height: 60,
                transform: 'translate(-50%, -50%)',
                background: color,
                filter: 'blur(14px)',
                animation: 'presence-effect-glow 2s ease-in-out infinite',
              }}
            />
          );
        } else if (c.effectId === 'pulse') {
          // Two concentric expanding rings phased half-cycle apart
          // so there's always one mid-flight from the cursor outward.
          decoration = (
            <>
              {[0, -1].map((delay, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: 4,
                    top: 4,
                    width: 60,
                    height: 60,
                    border: `2px solid ${color}`,
                    transformOrigin: 'center',
                    animation: 'presence-effect-ring 2s ease-out infinite',
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </>
          );
        } else if (c.effectId === 'rainbow') {
          // Decoration is "the colour itself" — handled by the
          // hue-cycling color override above. No extra DOM.
          decoration = null;
        }
        // 'classic' falls through with decoration = null.

        return (
          <div
            key={c.user_id}
            className="absolute top-0 left-0 will-change-transform transition-transform duration-75 ease-linear"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            {decoration}

            {/* Cursor arrow — shared across every effect so the
                pointer tip is always crisp. drop-shadow keeps it
                readable on light backgrounds; the colored shadow
                adds an outer halo that reads under any decoration. */}
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

            {/* Classic-only name pill — without trail / sparkles /
                rings to identify the cursor, the bare arrow could
                belong to anyone. The pill puts the user's first
                name (or initial) right next to the tip so they're
                still recognisable. Other effects hide it because
                their decoration already carries identity. */}
            {c.effectId === 'classic' && (
              <span
                className="absolute pointer-events-none px-1.5 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap"
                style={{
                  left: 18,
                  top: 2,
                  backgroundColor: color,
                  fontFamily: 'var(--font-body)',
                  boxShadow: `0 1px 3px ${color}66`,
                }}
              >
                {c.name || initial}
              </span>
            )}

            {/* Avatar — same disc on every effect. Colour ring
                follows the chosen / hue-cycling colour. */}
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
