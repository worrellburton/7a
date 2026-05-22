'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

// ─── Home page log-rain ──────────────────────────────────────────────
//
// For every touchpoint (`contact_logs` row) logged today, a 🪵 emoji
// falls from the top of the centerpiece, tumbles down behind the
// "Online today" orbit, and piles up at the bottom. Hovering a piled
// log surfaces a tooltip with who logged it and which contact it was.
//
// Built in 10 phases (see PR commit body for the breakdown). The
// component is self-contained: it owns its data fetch, its realtime
// subscription, a hand-rolled verlet/AABB physics loop, and a DOM
// renderer layered behind the orbit (orbit is z-50; rain is z-0).
//
// Toggle: a small "Show logs on home" chip persists per-user via
// localStorage; switch it off and the rain stops + clears.

// ─── Types ────────────────────────────────────────────────────────────

interface LogDrop {
  id: string;
  made_at: string;
  method: string | null;
  by_id: string | null;
  by_name: string | null;
  by_avatar: string | null;
  contact_id: string | null;
  contact_name: string | null;
}

interface Particle {
  // Identity — used for hover lookup + dedupe across realtime
  // inserts vs backfill replays.
  id: string;
  meta: LogDrop;

  // Physics state. Positions are in viewport-CSS pixels relative to
  // the rain layer's bottom-left corner; the renderer flips Y so
  // gravity reads downward in math, downward in pixels.
  x: number;
  y: number;        // distance above the floor
  vx: number;
  vy: number;
  r: number;        // collision radius
  rot: number;      // current rotation (deg) for visual tumble
  rotVel: number;   // angular velocity (deg/frame)
  size: number;     // font-size (px), drives visual size
  settled: boolean; // true once velocity drops below epsilon; we
                     // stop integrating to save cycles in big piles.
  bornAt: number;   // performance.now() at spawn — for fade-out cap
}

// ─── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'sa.home.show_log_rain';
const MAX_PARTICLES = 150; // oldest fade out beyond this
const GRAVITY = 0.55;       // px/frame²
const REST_VELOCITY = 0.15; // below this, particle "rests" on the pile
const RESTITUTION = 0.18;   // bounce loss on floor / collisions
const FRICTION = 0.985;     // air drag per frame
const COLLISION_ITERS = 3;  // pairwise correction passes per step
const ROT_DRAG = 0.97;      // angular velocity drag
const BACKFILL_STAGGER_MS = 80; // ms between replay drops

// ─── Helpers ──────────────────────────────────────────────────────────

function phxDayKey(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

// Milliseconds until the next Phoenix midnight. Phoenix doesn't
// observe DST so the offset is stable; we can compute it locally
// without a tz library.
function msUntilPhxMidnight(): number {
  const now = new Date();
  const phxToday = phxDayKey(now);
  const todayMidnightUtc = new Date(`${phxToday}T07:00:00.000Z`).getTime();
  const tomorrowMidnightUtc = todayMidnightUtc + 24 * 60 * 60 * 1000;
  return Math.max(60_000, tomorrowMidnightUtc - now.getTime());
}

function methodLabel(m: string | null): string {
  if (!m) return 'touchpoint';
  const map: Record<string, string> = {
    call: 'call',
    text: 'text',
    email: 'email',
    in_person: 'in-person visit',
    voicemail: 'voicemail',
    note: 'note',
    data_entry: 'data entry',
    email_campaign: 'email campaign',
  };
  return map[m] ?? m.replace(/_/g, ' ');
}

function timeOfDay(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Phoenix',
    });
  } catch {
    return '';
  }
}

// ─── Toggle hook ──────────────────────────────────────────────────────
// Per-user, per-browser. Default ON so existing teammates see the
// feature on first refresh after deploy; they can turn it off and the
// preference sticks across sessions.

export function useShowRainPreference(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === '0') setEnabled(false);
      else setEnabled(true);
    } catch {
      // localStorage unavailable — leave default ON
    }
  }, []);

  const setEnabledPersisted = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // best-effort
    }
  }, []);

  return [enabled, setEnabledPersisted];
}

// ─── Toggle chip ──────────────────────────────────────────────────────
// Rendered separately (HomeContent imports it) so the rain can be
// switched off without unmounting the whole orbit / page chrome.

export function HomeLogRainToggle({
  enabled,
  onChange,
  count,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      title={enabled ? 'Hide log rain on home' : 'Show log rain on home'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-colors ${
        enabled
          ? 'border-emerald-400/40 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100'
          : 'border-black/10 bg-white/80 text-foreground/55 hover:text-foreground hover:border-foreground/30'
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span aria-hidden="true">🪵</span>
      <span>Logs on home</span>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-foreground/30'}`}
        aria-hidden="true"
      />
      {enabled && count > 0 && (
        <span className="ml-0.5 tabular-nums text-emerald-700/80">{count}</span>
      )}
    </button>
  );
}

// ─── Hover-tooltip state shared via Context-free props ────────────────

interface HoverInfo { meta: LogDrop; left: number; top: number }

// ─── Main component ──────────────────────────────────────────────────

export default function HomeLogRain({
  enabled,
  onCountChange,
}: {
  enabled: boolean;
  onCountChange?: (n: number) => void;
}) {
  const { user, session } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  // Particle list lives in a ref so the rAF loop can mutate in place
  // without forcing a React re-render on every frame. We then snap a
  // shallow copy into state once per frame so the DOM keeps up.
  const particlesRef = useRef<Particle[]>([]);
  const [renderTick, setRenderTick] = useState(0);

  // De-dupe: never spawn the same log id twice (backfill might race
  // realtime; refresh shouldn't double up).
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Day boundary tracking. When the Phoenix calendar day flips we
  // wipe the pile and refetch from scratch.
  const dayKeyRef = useRef<string>(phxDayKey());

  // ─── Phase 1+2: container measurement ──────────────────────────────
  useEffect(() => { setPortalReady(true); }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(0, r.width), h: Math.max(0, r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  // ─── Particle factory ──────────────────────────────────────────────
  const spawnParticle = useCallback((meta: LogDrop, opts?: { atRandom?: boolean }) => {
    if (!size) return;
    if (seenIdsRef.current.has(meta.id)) return;
    seenIdsRef.current.add(meta.id);

    // Slight size variance keeps the pile from looking like a brick
    // grid. 16–22px font ⇒ ~12–16px collision radius.
    const fontSize = 16 + Math.random() * 6;
    const r = fontSize * 0.7;

    // Spawn x: spread across the inner ~70% of the width so logs
    // don't pile up only against the side walls.
    const spawnX = size.w * 0.15 + Math.random() * size.w * 0.7;
    // Spawn from just above the top of the layer with a small
    // downward push so the fall feels physical instantly.
    const spawnY = size.h + r + 12;

    const p: Particle = {
      id: meta.id,
      meta,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 1.2,
      vy: opts?.atRandom ? -1.5 - Math.random() * 0.8 : -2.0 - Math.random() * 1.0,
      r,
      rot: Math.random() * 60 - 30,
      rotVel: (Math.random() - 0.5) * 4,
      size: fontSize,
      settled: false,
      bornAt: performance.now(),
    };
    particlesRef.current.push(p);

    // Cap visible particles. Oldest first to fade out (we just drop
    // them; the DOM unmount handles the visual disappearance).
    if (particlesRef.current.length > MAX_PARTICLES) {
      const removed = particlesRef.current.splice(0, particlesRef.current.length - MAX_PARTICLES);
      for (const x of removed) seenIdsRef.current.delete(x.id);
    }
  }, [size]);

  // ─── Phase 5: backfill today's logs on mount ───────────────────────
  const fetchToday = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/contact-logs/today', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { logs: LogDrop[] };
      const logs = Array.isArray(json.logs) ? json.logs : [];
      onCountChange?.(logs.length);
      // Stagger the replay so the screen doesn't get a vertical
      // pillar of overlapping spawns at frame 0.
      for (let i = 0; i < logs.length; i += 1) {
        const meta = logs[i];
        setTimeout(() => spawnParticle(meta, { atRandom: true }), i * BACKFILL_STAGGER_MS);
      }
    } catch {
      // non-fatal; realtime will still surface new ones
    }
  }, [session?.access_token, spawnParticle, onCountChange]);

  useEffect(() => {
    if (!enabled || !size) return;
    void fetchToday();
  }, [enabled, size, fetchToday]);

  // ─── Phase 6: realtime live drops ──────────────────────────────────
  useEffect(() => {
    if (!enabled || !user?.id) return;
    const channel = supabase
      .channel(`home-log-rain-${user.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_logs' },
        (payload) => {
          const row = payload.new as {
            id: string;
            contacted_at: string;
            method: string | null;
            contacted_by: string | null;
            contact_id: string | null;
          };
          // The realtime payload doesn't carry the join — surface a
          // minimal LogDrop and let the hover render gracefully even
          // without the rep / contact name lookups. (We could fetch
          // them on demand later if we want richer hover for live
          // drops; deferred for now.)
          const meta: LogDrop = {
            id: row.id,
            made_at: row.contacted_at,
            method: row.method,
            by_id: row.contacted_by,
            by_name: null,
            by_avatar: null,
            contact_id: row.contact_id,
            contact_name: null,
          };
          spawnParticle(meta);
          onCountChange?.(seenIdsRef.current.size);
          // Best-effort enrich: pull the joined row for a richer
          // tooltip a beat later. Failure is silent.
          void enrichLater(meta.id);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [enabled, user?.id, spawnParticle, onCountChange]);

  // After a realtime insert, fetch the same row via REST so we can
  // patch the rep + contact names into the existing particle's meta
  // (the realtime payload itself doesn't carry the joined fields).
  const enrichLater = useCallback(async (logId: string) => {
    try {
      const res = await fetch('/api/contact-logs/today', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { logs: LogDrop[] };
      const match = (json.logs ?? []).find((l) => l.id === logId);
      if (!match) return;
      const p = particlesRef.current.find((x) => x.id === logId);
      if (p) p.meta = match;
    } catch { /* non-fatal */ }
  }, []);

  // ─── Phase 8: day-cycle reset ──────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      // The day rolled — clear pile, clear de-dupe, refetch from 0.
      particlesRef.current = [];
      seenIdsRef.current = new Set();
      dayKeyRef.current = phxDayKey();
      setRenderTick((n) => n + 1);
      onCountChange?.(0);
      void fetchToday();
    }, msUntilPhxMidnight());
    return () => clearTimeout(t);
  }, [enabled, fetchToday, onCountChange, renderTick]); // renderTick re-arms after each cycle

  // ─── Phase 3+4: physics loop ───────────────────────────────────────
  useEffect(() => {
    if (!enabled || !size) return;
    let raf = 0;
    let lastT = performance.now();

    const step = (now: number) => {
      // dt-aware step in case the tab was throttled — clamp to 4
      // frames worth so a returning-from-background tab doesn't
      // teleport everything through the floor.
      const dt = Math.min(4, (now - lastT) / 16.6667);
      lastT = now;

      // Pause physics entirely when the tab is hidden — Chrome
      // pauses rAF anyway but this defends against the throttled
      // 1Hz callback some browsers still fire.
      if (typeof document !== 'undefined' && document.hidden) {
        raf = requestAnimationFrame(step);
        return;
      }

      const ps = particlesRef.current;
      const floorY = 0; // bottom of the layer in our flipped frame
      const leftWall = 0;
      const rightWall = size.w;

      // Integrate.
      for (const p of ps) {
        if (p.settled) continue;
        p.vy -= GRAVITY * dt;          // gravity pulls Y toward floor (down = -y in our frame)
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rotVel * dt;
        p.rotVel *= ROT_DRAG;

        // Side walls
        if (p.x - p.r < leftWall) {
          p.x = leftWall + p.r;
          p.vx = -p.vx * RESTITUTION;
        }
        if (p.x + p.r > rightWall) {
          p.x = rightWall - p.r;
          p.vx = -p.vx * RESTITUTION;
        }

        // Floor
        if (p.y - p.r < floorY) {
          p.y = floorY + p.r;
          p.vy = -p.vy * RESTITUTION;
          p.vx *= 0.9;
          p.rotVel *= 0.5;
          if (Math.abs(p.vy) < REST_VELOCITY && Math.abs(p.vx) < REST_VELOCITY) {
            p.vy = 0; p.vx = 0; p.rotVel *= 0.4;
            // Don't mark settled yet — wait until collisions also
            // calm down. Otherwise an incoming top-falling log
            // wouldn't push this one out of the way.
          }
        }
      }

      // Pairwise circle collisions — O(n²) but n is capped at 150,
      // so worst-case ~11k checks/frame. Plenty of headroom.
      for (let iter = 0; iter < COLLISION_ITERS; iter += 1) {
        for (let i = 0; i < ps.length; i += 1) {
          for (let j = i + 1; j < ps.length; j += 1) {
            const a = ps[i];
            const b = ps[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist2 = dx * dx + dy * dy;
            const minD = a.r + b.r;
            if (dist2 >= minD * minD || dist2 === 0) continue;
            const dist = Math.sqrt(dist2);
            const overlap = (minD - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            // Positional correction — push them apart equally.
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            // Velocity response — exchange normal components with
            // restitution. Tangential components untouched (no
            // friction model between particles; the angular drag
            // alone is plenty for the visual).
            const vRelN = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vRelN < 0) {
              const impulse = -(1 + RESTITUTION) * vRelN / 2;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
              a.rotVel += (Math.random() - 0.5) * Math.abs(vRelN) * 0.2;
              b.rotVel += (Math.random() - 0.5) * Math.abs(vRelN) * 0.2;
            }
          }
        }
      }

      // Settle pass: anything that's barely moving and resting on
      // the floor (or on another settled particle) goes inactive.
      for (const p of ps) {
        if (p.settled) continue;
        const slow = Math.abs(p.vx) < REST_VELOCITY && Math.abs(p.vy) < REST_VELOCITY;
        if (slow && p.y - p.r <= 1) {
          p.settled = true;
          p.vx = 0; p.vy = 0; p.rotVel = 0;
        }
      }

      setRenderTick((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled, size]);

  // ─── Phase 9: cleanup when disabled ────────────────────────────────
  useEffect(() => {
    if (enabled) return;
    particlesRef.current = [];
    seenIdsRef.current = new Set();
    setHover(null);
    setRenderTick((n) => n + 1);
    onCountChange?.(0);
  }, [enabled, onCountChange]);

  // ─── Renderer ──────────────────────────────────────────────────────
  // Render only changes on renderTick — we read mutable particles
  // straight off the ref. This keeps physics in raf and React idle.
  const particles = useMemo(() => particlesRef.current.slice(), [renderTick]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={containerRef}
        // Behind the orbit (which is z-50), above the page background.
        // pointer-events: none on the container so the layer never
        // blocks clicks on the page; each particle re-enables its own
        // pointer-events so hover still works.
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {size && particles.map((p) => {
          // Y in our physics frame is "distance above floor"; CSS
          // wants top, so flip to (h - y - r) and use top so
          // transform-origin stays at the center.
          const cssLeft = p.x;
          const cssTop = size.h - p.y;
          return (
            <span
              key={p.id}
              className="absolute select-none pointer-events-auto"
              style={{
                left: 0,
                top: 0,
                transform: `translate3d(${cssLeft - p.size / 2}px, ${cssTop - p.size / 2}px, 0) rotate(${p.rot}deg)`,
                fontSize: `${p.size}px`,
                lineHeight: 1,
                filter: 'drop-shadow(0 2px 3px rgba(70, 40, 20, 0.18))',
                cursor: 'help',
                willChange: 'transform',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHover({
                  meta: p.meta,
                  left: rect.left + rect.width / 2,
                  top: rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
            >
              🪵
            </span>
          );
        })}
      </div>

      {/* Hover tooltip — portaled to body so it's never clipped by
          the centerpiece's overflow. Pointer-events disabled so the
          tooltip can't intercept its own mouseleave. */}
      {portalReady && hover && createPortal(
        <div
          role="tooltip"
          className="fixed z-[200] pointer-events-none"
          style={{
            left: hover.left,
            top: Math.max(8, hover.top - 12),
            transform: 'translate(-50%, -100%)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div className="rounded-lg bg-foreground/95 text-white px-3 py-2 text-[11.5px] leading-snug shadow-lg max-w-[260px]">
            <div className="flex items-center gap-2">
              {/* Avatar of the rep who logged the touchpoint.
                  Falls back to a monogram bubble when avatar_url
                  is missing (e.g. realtime drops that haven't been
                  enriched yet, or users without a profile photo). */}
              {hover.meta.by_avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={hover.meta.by_avatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white/15 shrink-0"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-7 h-7 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-[11px] font-semibold shrink-0"
                >
                  {(hover.meta.by_name ?? '?').trim().slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {hover.meta.by_name ?? 'A teammate'} · {methodLabel(hover.meta.method)}
                </p>
                <p className="text-white/75 mt-0.5">
                  {hover.meta.contact_name
                    ? <>with <span className="font-medium">{hover.meta.contact_name}</span></>
                    : <span className="italic">contact name not loaded</span>}
                </p>
              </div>
            </div>
            <p className="text-white/45 mt-1.5 text-[10px] tracking-wider uppercase">
              {timeOfDay(hover.meta.made_at)}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
