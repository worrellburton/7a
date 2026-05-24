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
  // Free-text describing the touch — for Data Entry rows this is
  // the "added phone, added email" summary the PATCH route writes,
  // which the tooltip surfaces verbatim so admins see what was
  // filled without opening the contact.
  comments: string | null;
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
const LAST_SEEN_KEY = 'sa.home.log_rain.last_seen_at';
const MOBILE_BREAKPOINT_PX = 640;
// Desktop: a real pile but bounded — 120 is more than enough to
// read as 'today's logs piled up' without flooding the rAF.
// Mobile: static layout (no rAF), tighter cap to keep the DOM
// span list short on phones.
const MAX_PARTICLES_DESKTOP = 120;
const MAX_PARTICLES_MOBILE = 30;
// 4 collision iters give noticeably tighter packing than 3 with
// no measurable rAF cost on desktop. Mobile uses static layout
// so the iter constant is unused there.
const COLLISION_ITERS_DESKTOP = 4;
const COLLISION_ITERS_MOBILE = 2;
const GRAVITY = 0.55;          // px/frame²
// Lower restitution = less bounce = pile settles faster + flatter.
// Old value (0.18) had visible jitter as logs landed; 0.08 reads
// as 'wood lands on wood' (almost no bounce).
const RESTITUTION = 0.08;
const REST_VELOCITY = 0.4;     // velocity threshold to call a particle settled (raised from 0.15 so we stop integrating sooner)
const FRICTION = 0.97;         // air drag per frame (raised from 0.985 so horizontal velocity bleeds off faster — keeps the pile centred instead of drifting)
const ROT_DRAG = 0.93;         // angular velocity drag (raised so rotation calms quickly)
const BACKFILL_STAGGER_MS = 50;// ms between live-replay drops
const TAP_TOOLTIP_MS = 1800;   // touch-tap shows tooltip for this long
// Spawn x is constrained to a centred column so the pile heaps
// in the middle instead of spanning the whole viewport. 0.30
// means spawns land between 30% and 70% of the container width.
const SPAWN_X_INSET = 0.30;
// Pile floor sits this fraction up from the container's bottom
// so the heap reads as 'on the desert floor' beneath the orbit,
// not glued to the page footer.
const FLOOR_INSET_FRAC = 0.06;

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
  // The DB stores method as already-capitalised display strings
  // (e.g. 'Phone', 'Data Entry', 'New Contact'), so return as-is
  // when it matches the known canon. Fall back to a snake-to-words
  // pass for any legacy or future enum value.
  const known = new Set([
    'Phone',
    'In Person',
    'Left Message',
    'Text Message',
    'Email',
    'Email Campaign',
    'Data Entry',
    'New Contact',
    'Smoke Signals',
    'Walkie Talkie',
    'Tin Can Phone',
  ]);
  if (known.has(m)) return m;
  return m.replace(/_/g, ' ');
}

// "Last seen" tracks the newest log timestamp this browser has
// already observed, so a refresh doesn't re-animate every log of
// the day — only ones that arrived since the last visit fall. Logs
// older than lastSeen pre-settle silently at the bottom of the
// pile.
function readLastSeenMs(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    if (!raw) return Date.now(); // first visit ever — treat all today's logs as already-seen
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastSeenMs(ms: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, new Date(ms).toISOString());
  } catch { /* best-effort */ }
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

// Default ON for every visitor. Only an explicit '0' in
// localStorage (meaning the user toggled it off in a previous
// session) overrides the default — every other state (no key,
// '1', malformed, storage unavailable) lands on ON so the
// feature is visible by default.
export function useShowRainPreference(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setEnabled(raw === '0' ? false : true);
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
      title={enabled ? 'Hide daily logs on home' : 'Show daily logs on home'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-colors ${
        enabled
          ? 'border-emerald-400/40 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100'
          : 'border-black/10 bg-white/80 text-foreground/55 hover:text-foreground hover:border-foreground/30'
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span aria-hidden="true">🪵</span>
      {/* Full label on tablet+; just the dot + count on phones so
          the hero row can hold both this chip and the + button. */}
      <span className="hidden sm:inline">Daily logs</span>
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
  // Mobile vs desktop drives particle ceilings, font-size range,
  // collision-iter budget, and the touch-vs-hover affordance. We
  // watch matchMedia so a rotate / dev-tools resize re-applies.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener?.('change', apply);
    return () => mql.removeEventListener?.('change', apply);
  }, []);
  // Touch-tap tooltip auto-dismiss timer.
  const tapTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
  }, []);

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
  const spawnParticle = useCallback((meta: LogDrop, opts?: { atRandom?: boolean; preSettled?: boolean }) => {
    // Desktop physics path needs container dimensions to compute
    // spawn coordinates; mobile static path doesn't, so let it
    // through before size is measured.
    if (!size && !isMobile) return;
    if (seenIdsRef.current.has(meta.id)) return;
    seenIdsRef.current.add(meta.id);

    // Bigger emojis on mobile, not smaller — they need to actually
    // be visible + tappable on a small viewport. Pile density is
    // capped by MAX_PARTICLES_MOBILE so the screen doesn't fill
    // up. Desktop emoji size is slightly larger now (18-22 vs the
    // old 16-22) so the pile reads as 'logs' from across the room.
    const fontSize = isMobile
      ? 18 + Math.random() * 6   // 18–24px on mobile
      : 18 + Math.random() * 4;  // 18–22px on desktop
    const r = fontSize * 0.7;

    // Spawn x: constrained to the centred 40% of the container
    // (30%–70%) so the pile heaps in the middle of the screen
    // instead of spanning the full viewport. The wider 12-88%
    // spawn used to produce a thin horizontal wave; this column
    // gives a proper mound. Mobile static path ignores x/y
    // entirely; default to 0s when size isn't measured (early-
    // mount mobile spawn before layout).
    const width = size?.w ?? 0;
    const xMin = width * SPAWN_X_INSET;
    const xMax = width * (1 - SPAWN_X_INSET);
    const spawnX = width > 0 ? xMin + Math.random() * (xMax - xMin) : 0;

    // Floor sits FLOOR_INSET_FRAC up from the container's bottom
    // so the pile reads as 'on the desert floor below the orbit',
    // not glued to the page footer.
    const floorY = (size?.h ?? 0) * FLOOR_INSET_FRAC;

    if (opts?.preSettled) {
      // "Already seen" — drop straight onto the floor with zero
      // velocity. The collision pass will redistribute overlaps in
      // a frame or two. Visually reads as 'already piled' rather
      // than 'just fell'.
      const p: Particle = {
        id: meta.id,
        meta,
        x: spawnX,
        y: floorY + r + Math.random() * 3,
        vx: 0,
        vy: 0,
        r,
        rot: (Math.random() - 0.5) * 30,  // less rotation — pile reads as 'stacked', not 'tumbled'
        rotVel: 0,
        size: fontSize,
        settled: false,                   // let physics resolve overlaps once
        bornAt: performance.now(),
      };
      particlesRef.current.push(p);
    } else {
      // Live drop — fall from above the layer with a tiny downward
      // push so the motion reads as physical instantly.
      const spawnY = (size?.h ?? 0) + r + 12;
      const p: Particle = {
        id: meta.id,
        meta,
        x: spawnX,
        y: spawnY,
        // Less horizontal jitter so the fall reads as 'dropped',
        // not 'thrown'. Vertical impulse stays so the fall feels
        // physical right away.
        vx: (Math.random() - 0.5) * 0.6,
        vy: opts?.atRandom ? -1.5 - Math.random() * 0.8 : -2.0 - Math.random() * 1.0,
        r,
        rot: Math.random() * 40 - 20,     // narrower rot range so logs land flatter
        rotVel: (Math.random() - 0.5) * 2,
        size: fontSize,
        settled: false,
        bornAt: performance.now(),
      };
      particlesRef.current.push(p);
    }

    // Cap visible particles per platform. Oldest first to fade out
    // (we just drop them; the DOM unmount handles the visual
    // disappearance).
    const cap = isMobile ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
    if (particlesRef.current.length > cap) {
      const removed = particlesRef.current.splice(0, particlesRef.current.length - cap);
      for (const x of removed) seenIdsRef.current.delete(x.id);
    }

    // Bump the render tick on every spawn so the React tree
    // reflects the new particle. On desktop the rAF loop also
    // bumps every frame, so this is a no-op overhead; on mobile
    // (no rAF loop in the static-pile branch) it's the ONLY
    // signal that pulls the new particle into the DOM — without
    // it the mobile pile renders as empty even with 100+ entries
    // in the ref.
    setRenderTick((n) => (n + 1) % 1_000_000);
  }, [size, isMobile]);

  // ─── Phase 5: backfill today's logs on mount ───────────────────────
  // Anything older than the lastSeen timestamp spawns pre-settled at
  // the bottom (no animation, no stagger). Anything newer drops from
  // the top with the same backfill stagger we had before — so logs
  // that arrived between the user's last refresh and this one still
  // get the "look, this happened while you were away" reveal.
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

      const lastSeen = readLastSeenMs();
      const alreadySeen: LogDrop[] = [];
      const newSinceLastVisit: LogDrop[] = [];
      for (const log of logs) {
        const ts = new Date(log.made_at).getTime();
        if (Number.isFinite(ts) && ts > lastSeen) newSinceLastVisit.push(log);
        else alreadySeen.push(log);
      }

      // Pre-settled batch: same frame, no animation. Collision pass
      // sorts out the brief overlap.
      for (const meta of alreadySeen) {
        spawnParticle(meta, { preSettled: true });
      }
      // New-since-last-visit batch. Desktop: staggered fall from
      // the top. Mobile: no animation path at all — spawn them all
      // in one frame so the static pile fills immediately instead
      // of popping in one item at a time.
      if (isMobile) {
        for (const meta of newSinceLastVisit) {
          spawnParticle(meta, { preSettled: true });
        }
      } else {
        for (let i = 0; i < newSinceLastVisit.length; i += 1) {
          const meta = newSinceLastVisit[i];
          setTimeout(() => spawnParticle(meta, { atRandom: true }), i * BACKFILL_STAGGER_MS);
        }
      }

      // Bump lastSeen to the newest log we just observed (or now,
      // whichever is larger) so the next refresh treats all of
      // today's logs through this moment as already-seen.
      const newest = logs.reduce(
        (acc, l) => Math.max(acc, new Date(l.made_at).getTime() || 0),
        lastSeen,
      );
      writeLastSeenMs(Math.max(newest, Date.now()));
    } catch {
      // non-fatal; realtime will still surface new ones
    }
  }, [session?.access_token, spawnParticle, onCountChange]);

  useEffect(() => {
    if (!enabled) return;
    // Desktop needs size for spawn-x/spawn-y math; mobile renders a
    // static pile that doesn't depend on container measurement, so
    // fetch immediately on mobile.
    if (!isMobile && !size) return;
    void fetchToday();
  }, [enabled, size, isMobile, fetchToday]);

  // ─── Phase 6: realtime live drops ──────────────────────────────────
  //
  // Perf phase 7 — document-visibility gating: this channel is the
  // single highest-traffic realtime listener in the app (every
  // contact_logs INSERT fires it, across the whole team). When the
  // tab is hidden the browser throttles render work anyway, so any
  // events we receive get queued / dropped on the floor — meanwhile
  // the open WebSocket holds the network process awake (bad for
  // battery on phones) and pins a supabase connection slot. We
  // open the channel on mount when visible, close it when the tab
  // is hidden, and re-open + re-fetch when it comes back so the
  // rain stays current without leaking the connection in the
  // background.
  useEffect(() => {
    if (!enabled || !user?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let attached = false;
    const attach = () => {
      if (attached) return;
      attached = true;
      channel = supabase
      .channel(`home-log-rain-${user.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_logs' },
        (payload) => {
          const row = payload.new as {
            id: string;
            contacted_at: string;
            method: string | null;
            comments: string | null;
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
            comments: row.comments,
            by_id: row.contacted_by,
            by_name: null,
            by_avatar: null,
            contact_id: row.contact_id,
            contact_name: null,
          };
          spawnParticle(meta);
          onCountChange?.(seenIdsRef.current.size);
          // Touch the lastSeen mark forward as live drops arrive so
          // a refresh right after won't re-animate them.
          const ts = new Date(meta.made_at).getTime();
          if (Number.isFinite(ts)) writeLastSeenMs(Math.max(readLastSeenMs(), ts));
          // Best-effort enrich: pull the joined row for a richer
          // tooltip a beat later. Failure is silent.
          void enrichLater(meta.id);
        },
      )
      .subscribe();
    };
    const detach = () => {
      if (!attached) return;
      attached = false;
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        attach();
        // Catch up on logs that landed while the tab was hidden so
        // a returning user immediately sees recent activity instead
        // of an empty rain that fills as new events trickle in.
        void fetchToday();
      } else {
        detach();
      }
    };
    if (document.visibilityState === 'visible') attach();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      detach();
    };
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
      // Bump lastSeen to the new midnight so any logs that landed
      // in the new day so far are treated as already-seen (the
      // page was open through midnight; if a teammate happened to
      // log in the same second the user wasn't actively watching).
      // New logs from this moment on will animate normally.
      particlesRef.current = [];
      seenIdsRef.current = new Set();
      dayKeyRef.current = phxDayKey();
      writeLastSeenMs(Date.now());
      setRenderTick((n) => n + 1);
      onCountChange?.(0);
      void fetchToday();
    }, msUntilPhxMidnight());
    return () => clearTimeout(t);
  }, [enabled, fetchToday, onCountChange, renderTick]); // renderTick re-arms after each cycle

  // ─── Phase 3+4: physics loop ───────────────────────────────────────
  // Desktop only — mobile bypasses the simulation entirely and
  // renders a static CSS pile (see renderer below). The collision
  // pass was burning frame budget on midrange phones even with
  // particle counts capped at 40, and a static pile reads as
  // 'pile' just as well visually.
  useEffect(() => {
    if (!enabled || !size || isMobile) return;
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
      // Floor sits FLOOR_INSET_FRAC up from the container's bottom
      // so the pile reads as a base layer rather than touching the
      // page footer. Walls are narrower than the full width too —
      // we constrain the pile column so a log can't drift to the
      // edge of the screen, only to the edge of the heap zone.
      const floorY = (size?.h ?? 0) * FLOOR_INSET_FRAC;
      const wallInset = (size?.w ?? 0) * 0.18;
      const leftWall = wallInset;
      const rightWall = (size?.w ?? 0) - wallInset;

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

        // Floor — clamp on landing, kill most of the bounce, drop
        // horizontal momentum quickly so logs don't skid sideways
        // out of the pile column.
        if (p.y - p.r < floorY) {
          p.y = floorY + p.r;
          p.vy = -p.vy * RESTITUTION;
          p.vx *= 0.6;                  // was 0.9 — kills skid
          p.rotVel *= 0.3;              // was 0.5 — kills wobble
          if (Math.abs(p.vy) < REST_VELOCITY && Math.abs(p.vx) < REST_VELOCITY) {
            p.vy = 0; p.vx = 0; p.rotVel = 0;
            // Mark settled immediately when at the floor + slow.
            // Was 'wait for collisions to also calm down' — that
            // never actually happened in practice and left the
            // pile twitching forever.
            p.settled = true;
          }
        }
      }

      // Pairwise circle collisions — O(n²) but n is capped at 150,
      // so worst-case ~11k checks/frame. Plenty of headroom.
      const collisionIters = isMobile ? COLLISION_ITERS_MOBILE : COLLISION_ITERS_DESKTOP;
      for (let iter = 0; iter < collisionIters; iter += 1) {
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

      // Settle pass: anything that's barely moving goes inactive,
      // regardless of whether it's at the floor or resting on
      // another particle. Without this the pile's upper layer
      // jitters indefinitely as new drops nudge old ones.
      for (const p of ps) {
        if (p.settled) continue;
        const slow = Math.abs(p.vx) < REST_VELOCITY && Math.abs(p.vy) < REST_VELOCITY;
        if (slow) {
          p.settled = true;
          p.vx = 0; p.vy = 0; p.rotVel = 0;
        }
      }

      setRenderTick((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled, size, isMobile]);

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

  // Tap/hover handler shared between the desktop physics path
  // and the mobile static path.
  const openTooltipForRect = (meta: LogDrop, rect: DOMRect) => {
    setHover({ meta, left: rect.left + rect.width / 2, top: rect.top });
  };

  return (
    <>
      {isMobile ? (
        // ─── Mobile: static CSS pile ──────────────────────────────────
        // No physics, no rAF, no collisions. Logs render as a
        // flex-wrap-reverse strip pinned to the bottom of the
        // viewport so they fill upward from the floor and can never
        // fall off-screen. Each emoji gets a deterministic-ish
        // rotation based on its index so the pile reads as
        // 'tumbled' without a per-particle physics state.
        //
        // overflow-hidden + max-height clamp the pile so a busy day
        // doesn't push logs past the orbit; once we hit MAX_MOBILE
        // particles the oldest cycle out the top (handled by the
        // spawn capper).
        <div
          ref={containerRef}
          className="fixed inset-x-0 bottom-0 -z-10 overflow-hidden pointer-events-none px-3"
          style={{ maxHeight: '35vh' }}
          aria-hidden="true"
        >
          <div className="flex flex-wrap-reverse items-end justify-center gap-x-0.5 gap-y-0 pb-3">
            {particles.map((p, idx) => (
              <span
                key={p.id}
                className="select-none pointer-events-auto inline-block"
                style={{
                  fontSize: `${p.size}px`,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 1px 2px rgba(70, 40, 20, 0.18))',
                  cursor: 'pointer',
                  userSelect: 'none',
                  touchAction: 'manipulation',
                  transform: `rotate(${((idx * 37) % 40) - 20}deg)`,
                }}
                onTouchStart={(e) => {
                  openTooltipForRect(p.meta, e.currentTarget.getBoundingClientRect());
                  if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
                  tapTimerRef.current = window.setTimeout(() => setHover(null), TAP_TOOLTIP_MS);
                }}
              >
                🪵
              </span>
            ))}
          </div>
        </div>
      ) : (
        // ─── Desktop: physics-based rain ──────────────────────────────
        // Absolute inside the centerpiece, full physics loop. The
        // orbit at z-50 inside the same stacking context tucks the
        // rain behind it. Max-width caps the pile column on wide
        // monitors — without this, a 1600px viewport spread the
        // pile across the full screen as a thin wave instead of
        // a centred mound.
        <div
          ref={containerRef}
          className="absolute inset-x-0 bottom-0 top-0 z-0 overflow-hidden pointer-events-none mx-auto"
          style={{ maxWidth: '900px' }}
          aria-hidden="true"
        >
          {size && particles.map((p) => {
            const cssLeft = p.x;
            const cssTop = size.h - p.y;
            // Settled logs get a slightly tighter shadow + no
            // will-change (frees compositor layers once the
            // particle stops moving).
            const shadow = p.settled
              ? 'drop-shadow(0 1px 2px rgba(70, 40, 20, 0.22))'
              : 'drop-shadow(0 3px 5px rgba(70, 40, 20, 0.18))';
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
                  filter: shadow,
                  cursor: 'help',
                  willChange: p.settled ? 'auto' : 'transform',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => openTooltipForRect(p.meta, e.currentTarget.getBoundingClientRect())}
                onMouseLeave={() => setHover(null)}
              >
                🪵
              </span>
            );
          })}
        </div>
      )}

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
                {/* Body line is method-aware:
                    · New Contact → "added <name>"
                    · Data Entry  → the comments verbatim ("added phone, added email")
                    · everything else (Phone / Email / etc.) → "with <name>"
                    Falls back to italic placeholder when the meta
                    hasn't been enriched yet (very early in a realtime drop). */}
                {(() => {
                  const m = hover.meta.method;
                  const name = hover.meta.contact_name;
                  if (m === 'New Contact') {
                    return name
                      ? <p className="text-white/75 mt-0.5">added <span className="font-medium">{name}</span></p>
                      : <p className="text-white/55 mt-0.5 italic">contact name not loaded</p>;
                  }
                  if (m === 'Data Entry') {
                    const summary = (hover.meta.comments ?? '').trim();
                    return (
                      <p className="text-white/75 mt-0.5">
                        {summary || <span className="italic">filled in fields</span>}
                        {name && <span className="text-white/55"> on <span className="font-medium">{name}</span></span>}
                      </p>
                    );
                  }
                  return name
                    ? <p className="text-white/75 mt-0.5">with <span className="font-medium">{name}</span></p>
                    : <p className="text-white/55 mt-0.5 italic">contact name not loaded</p>;
                })()}
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
