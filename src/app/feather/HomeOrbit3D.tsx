'use client';

// 3D gyroscope orbit — the home page's "Online today" centerpiece,
// rebuilt from the flat rings into three axis-tilted 3D rings (staff /
// horses / alumni) around a glowing 7A core.
//
// Engine: a custom DOM projection — every avatar is a plain 2D sprite
// whose screen position/scale/z-order is computed per frame from ring
// math (ring-local angle → ring orientation → global rotation →
// perspective projection). No WebGL: with ~30-60 sprites this stays
// comfortably 60fps, keeps photos pixel-crisp in circular masks, makes
// hover cards + presence dots native DOM, and behaves identically on
// iOS. Faces are always readable because sprites never rotate — only
// their projected position moves (billboarding for free).
//
// Behaviour (per product direction):
//   * Cinematic ~3.8s intro on every visit: all rings start flat,
//     facing the camera ("see everything"), then tilt into their
//     gyroscope axes as the camera eases in — pictures "wrap" the orb.
//   * Endless slow drift after the intro settles.
//   * Drag (mouse or touch, anywhere on the scene) rotates the whole
//     gyroscope; flicks carry inertia that eases back into the drift.
//   * Hovering (tap on touch) a face raises a card with the person's
//     details. Green presence dot stays on the avatar itself.
//   * Ring radius grows with roster size — more people = bigger ring,
//     never denser or extra rings.
//   * prefers-reduced-motion: no intro, no drift — a static tilted
//     layout that still drags (without inertia).

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { toAvatarThumb } from '@/lib/avatarThumb';
import { humanizeActivityType } from './HomeOnlineOrbit';
import type { OrbitUser, OrbitHorse } from './HomeOnlineOrbit';

interface Props {
  users: OrbitUser[];
  alumni?: OrbitUser[];
  horses?: OrbitHorse[];
  pathLabelFor: (path: string | null) => string | null;
  highlightUserId?: string | null;
  staffNav?: boolean;
}

interface SpriteDef {
  key: string;
  kind: 'staff' | 'horse' | 'alumni';
  ring: number;       // ring index
  angle0: number;     // ring-local base angle (radians)
  size: number;       // avatar diameter px (base, before depth scale)
  name: string;
  sub: string | null;
  img: string | null;
  online: boolean;
  badge: string | null;      // e.g. sobriety "2y"
  onFire: boolean;
  highlight: boolean;
  viewing: string | null;
  // Activity-feed join (staff + alumni): today's action count and the
  // most recent entries, surfaced in the hover/tap card. null when the
  // enrichment hasn't landed (or for horses) — the card hides the block.
  actionsToday: number | null;
  recentActions: Array<{ type: string; target_label: string | null; created_at: string }>;
}

interface RingDef {
  tiltX: number; // radians — ring plane orientation
  tiltZ: number;
  radius: number; // 0..1 of scene half-size
  speed: number;  // per-ring phase drift (radians/sec)
}

const INTRO_MS = 3800;
const DRIFT_Y = 0.06;        // scene yaw drift (radians/sec)
const PERSPECTIVE = 3.2;     // camera distance in scene-half units

function isOnlineNow(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 6 * 60 * 1000;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomeOrbit3D({
  users,
  alumni = [],
  horses = [],
  pathLabelFor,
  highlightUserId = null,
  staffNav = true,
}: Props) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const spriteEls = useRef(new Map<string, HTMLDivElement>());
  const ringPathEls = useRef(new Map<number, SVGPathElement>());
  const [sceneSize, setSceneSize] = useState(0);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Phone-width scenes get a tighter fit: the 0.92 normalization plus
  // perspective overshoot pushes edge sprites past the viewport when
  // the scene square is edge-to-edge, so rings and avatars shrink a
  // notch below 480px.
  const compact = sceneSize > 0 && sceneSize < 480;

  // ── Scene model ─────────────────────────────────────────────
  const { sprites, rings } = useMemo(() => {
    // Ring radius grows with the roster: base + per-member increment,
    // normalised afterwards so the largest ring always fits the scene.
    const ringFor = (count: number) => 0.52 + Math.min(0.46, count * 0.012);
    const staffR = ringFor(users.length);
    const horseR = 0.42 + Math.min(0.2, horses.length * 0.008);
    // Alumni ring is anchored OUTSIDE the staff ring, not sized from
    // its own headcount — with a large staff roster and few alumni the
    // two radii used to converge and the bands visually collided.
    const alumniR = staffR + 0.22 + Math.min(0.1, alumni.length * 0.006);
    const maxR = Math.max(staffR, horseR, alumni.length > 0 ? alumniR : 0, 0.001);
    const norm = (compact ? 0.78 : 0.92) / maxR;

    // Gyroscope: three visibly distinct axes.
    const ringDefs: RingDef[] = [
      { tiltX: 1.15, tiltZ: 0.0, radius: staffR * norm, speed: 0.05 },              // staff — near-horizontal band
      { tiltX: 0.45, tiltZ: 1.05, radius: horseR * norm, speed: -0.07 },            // horses — leaning counter-band
      { tiltX: 0.75, tiltZ: -1.05, radius: alumniR * norm, speed: 0.04 },           // alumni — opposing lean
    ];

    const defs: SpriteDef[] = [];
    const push = (
      kind: SpriteDef['kind'],
      ring: number,
      idx: number,
      count: number,
      d: Omit<SpriteDef, 'kind' | 'ring' | 'angle0'>,
    ) => {
      defs.push({ ...d, kind, ring, angle0: (idx / Math.max(1, count)) * Math.PI * 2 });
    };

    users.forEach((u, i) =>
      push('staff', 0, i, users.length, {
        key: `u:${u.id}`,
        size: compact ? 40 : 46,
        name: u.full_name || 'Teammate',
        sub: u.job_title,
        img: u.avatar_thumb || toAvatarThumb(u.avatar_url) || u.avatar_url,
        online: isOnlineNow(u.last_seen_at),
        badge: null,
        onFire: (u.actions_today ?? 0) > 10,
        highlight: u.id === highlightUserId,
        viewing: staffNav ? pathLabelFor(u.last_path) : null,
        actionsToday: u.actions_today ?? null,
        recentActions: u.recent_actions ?? [],
      }),
    );
    horses.forEach((h, i) =>
      push('horse', 1, i, horses.length, {
        key: `h:${h.id}`,
        size: compact ? 33 : 38,
        name: h.name,
        sub: h.works_in ? `Works in ${h.works_in}` : 'Ranch horse',
        img: h.image_url,
        online: false,
        badge: null,
        onFire: false,
        highlight: false,
        viewing: null,
        actionsToday: null,
        recentActions: [],
      }),
    );
    alumni.forEach((a, i) =>
      push('alumni', 2, i, alumni.length, {
        key: `a:${a.id}`,
        size: compact ? 36 : 42,
        name: a.full_name || 'Alum',
        sub: a.sobriety_label ?? 'Alumni',
        img: a.avatar_thumb || toAvatarThumb(a.avatar_url) || a.avatar_url,
        online: isOnlineNow(a.last_seen_at),
        badge: a.sobriety_short_label ?? null,
        onFire: false,
        highlight: false,
        viewing: null,
        actionsToday: a.actions_today ?? null,
        recentActions: a.recent_actions ?? [],
      }),
    );
    return { sprites: defs, rings: ringDefs };
  }, [users, horses, alumni, highlightUserId, staffNav, pathLabelFor, compact]);

  const spriteByKey = useMemo(() => new Map(sprites.map((s) => [s.key, s])), [sprites]);

  // ── Animation state (refs — never re-render per frame) ──────
  const rot = useRef({ x: -0.18, y: -0.55 });     // camera euler
  const vel = useRef({ x: 0, y: 0 });             // drag inertia
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const startedAt = useRef(0);
  const interacted = useRef(false);

  // Measure the scene square.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setSceneSize(Math.round(e[0]?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Render loop ─────────────────────────────────────────────
  useEffect(() => {
    if (sceneSize <= 0 || sprites.length === 0) return;
    let raf = 0;
    let prev = performance.now();
    // Set the intro clock ONCE per mount. This effect re-runs whenever
    // sprites/rings/sceneSize change identity — which happens several
    // times right after load (activity-count and phones enrichment each
    // produce a new users array) and on every resize step — and
    // resetting startedAt here used to visibly replay the 3.8s intro
    // and snap ring drift back to phase 0 each time.
    if (!startedAt.current) startedAt.current = prev;
    const half = sceneSize / 2;
    // Members per ring — rings with no members skip their guide line
    // (an empty alumni ring otherwise draws an oversized stray arc,
    // since maxR normalization ignores empty populations).
    const ringCounts = [0, 0, 0];
    for (const spr of sprites) ringCounts[spr.ring] += 1;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // Intro progress → ring tilt multiplier. Interacting skips ahead.
      const tRaw = reducedMotion || interacted.current ? 1 : Math.min(1, (now - startedAt.current) / INTRO_MS);
      const intro = easeInOutCubic(tRaw);

      // Camera: drift + inertia.
      if (!dragging.current) {
        rot.current.y += (reducedMotion ? 0 : DRIFT_Y * dt) + vel.current.y;
        rot.current.x += vel.current.x;
        vel.current.x *= 0.94;
        vel.current.y *= 0.94;
        rot.current.x = Math.max(-1.1, Math.min(1.1, rot.current.x));
      }
      const cy = Math.cos(rot.current.y), sy = Math.sin(rot.current.y);
      const cx = Math.cos(rot.current.x), sx = Math.sin(rot.current.x);

      const project = (ring: RingDef, phase: number, angle0: number) => {
        // Ring-local point — a circle in the XY (camera-facing) plane,
        // so at intro=0 every ring reads as a full concentric circle
        // ("see everything") before the tilts wrap it around the orb.
        const a = angle0 + phase;
        const r = ring.radius;
        const x = Math.cos(a) * r, y = Math.sin(a) * r, z = 0;
        // Ring orientation, scaled by intro (flat → gyroscope tilt).
        const tX = ring.tiltX * intro, tZ = ring.tiltZ * intro;
        // rotateX(tX)
        let y1 = y * Math.cos(tX) - z * Math.sin(tX);
        let z1 = y * Math.sin(tX) + z * Math.cos(tX);
        let x1 = x;
        // rotateZ(tZ)
        const x2 = x1 * Math.cos(tZ) - y1 * Math.sin(tZ);
        const y2 = x1 * Math.sin(tZ) + y1 * Math.cos(tZ);
        const z2 = z1;
        // Camera yaw then pitch.
        const x3 = x2 * cy + z2 * sy;
        const z3 = -x2 * sy + z2 * cy;
        const y4 = y2 * cx - z3 * sx;
        const z4 = y2 * sx + z3 * cx;
        // Perspective.
        const s = PERSPECTIVE / (PERSPECTIVE - z4);
        return { px: half + x3 * s * half, py: half + y4 * s * half, s, z: z4 };
      };

      // Per-ring drift phase (frozen during intro's first half so the
      // "wrap" reads clean, then blended in).
      const elapsed = (now - startedAt.current) / 1000;
      const phaseFor = (ring: RingDef) => (reducedMotion ? 0 : ring.speed * elapsed * intro);

      for (const spr of sprites) {
        const el = spriteEls.current.get(spr.key);
        if (!el) continue;
        const ring = rings[spr.ring];
        const { px, py, s, z } = project(ring, phaseFor(ring), spr.angle0);
        const scale = Math.max(0.45, Math.min(1.35, s));
        el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.zIndex = String(1000 + Math.round(z * 400));
        el.style.opacity = String(Math.max(0.42, Math.min(1, 0.78 + z * 0.35)));
      }

      // Ring guide lines — sample each ring, draw as one soft path.
      for (let ri = 0; ri < rings.length; ri++) {
        const pathEl = ringPathEls.current.get(ri);
        if (!pathEl) continue;
        if (!ringCounts[ri]) { pathEl.setAttribute('d', ''); continue; }
        const ring = rings[ri];
        const phase = phaseFor(ring);
        let d = '';
        const STEPS = 64;
        for (let i = 0; i <= STEPS; i++) {
          const { px, py } = project(ring, phase, (i / STEPS) * Math.PI * 2);
          d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
        }
        pathEl.setAttribute('d', d);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Page Visibility API: hard-stop the loop while the tab is hidden.
    // Browsers already suspend rAF in background tabs, but making the
    // pause explicit is deterministic across browsers/webviews and
    // resets `prev` on resume so the first visible frame doesn't
    // integrate a stale timestamp.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sceneSize, sprites, rings, reducedMotion]);

  // ── Drag / inertia ──────────────────────────────────────────
  // Drag starts only after the pointer moves past a small threshold.
  // Capturing on pointerdown retargeted pointerup (and the derived
  // click) to the scene div, which meant sprite onClick never fired —
  // taps on faces did nothing on touch, where click is the only way to
  // raise the card. Deferring capture until an actual drag keeps taps
  // as taps and drags as drags.
  const pendingDrag = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    pendingDrag.current = true;
    dragging.current = false;
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel.current = { x: 0, y: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pendingDrag.current && !dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    if (!dragging.current) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return; // still a tap
      dragging.current = true;
      pendingDrag.current = false;
      interacted.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    rot.current.y += dx * 0.006;
    rot.current.x = Math.max(-1.1, Math.min(1.1, rot.current.x - dy * 0.004));
    // Track flick velocity for release inertia.
    vel.current = { x: -dy * 0.0009, y: dx * 0.0013 };
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = () => {
    pendingDrag.current = false;
    dragging.current = false;
    if (reducedMotion) vel.current = { x: 0, y: 0 };
  };

  // ── Hover / tap card ────────────────────────────────────────
  const showCard = (key: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setHoverKey(key);
    setCardPos({ x: r.left + r.width / 2, y: r.top });
  };
  const hoverSprite = hoverKey ? spriteByKey.get(hoverKey) ?? null : null;

  const online = users.filter((u) => isOnlineNow(u.last_seen_at)).length
    + alumni.filter((a) => isOnlineNow(a.last_seen_at)).length;

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Same "Online today" title the 2D orbit carries, kept in normal
          flow above the scene so tilted rings can never clip into it. */}
      <div className="hidden sm:block text-center pointer-events-none mb-1">
        <h2
          className="text-foreground font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.6vw, 1.85rem)' }}
        >
          Online <em className="not-italic text-primary">today</em>
        </h2>
        <p
          className="mt-1 text-[12px] text-foreground/55"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {online > 0
            ? `${online} ${online === 1 ? 'person' : 'people'} on Seven Arrows right now`
            : `${users.length} ${users.length === 1 ? 'teammate' : 'teammates'} active in the last 24 hours`}
        </p>
      </div>
      <div
        ref={sceneRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full max-w-[560px] aspect-square cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        role="img"
        aria-label={`Team orbit — ${online} online now`}
      >
        {/* Ring guide lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          {rings.map((_, ri) => (
            <path
              key={ri}
              ref={(el) => { if (el) ringPathEls.current.set(ri, el); }}
              fill="none"
              stroke="rgba(160,82,45,0.14)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Glowing 7A core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ zIndex: 1000 }}>
          <div className="sa-orb-core relative flex items-center justify-center w-20 h-20 rounded-full">
            <span className="text-[13px] font-bold tracking-[0.2em] text-primary" style={{ fontFamily: 'var(--font-display)' }}>7A</span>
          </div>
        </div>

        {/* Sprites */}
        {sprites.map((spr) => (
          <div
            key={spr.key}
            ref={(el) => { if (el) spriteEls.current.set(spr.key, el); else spriteEls.current.delete(spr.key); }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: spr.size, height: spr.size }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') showCard(spr.key, e.currentTarget); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') { setHoverKey(null); setCardPos(null); } }}
            onClick={(e) => {
              e.stopPropagation();
              if (hoverKey === spr.key) { setHoverKey(null); setCardPos(null); }
              else showCard(spr.key, e.currentTarget);
            }}
          >
            <div className={`relative w-full h-full rounded-full border-2 border-white shadow-md overflow-hidden bg-warm-bg ${spr.highlight ? 'sa-orb-highlight' : ''} ${spr.onFire ? 'ring-2 ring-amber-400/70' : ''}`}>
              {spr.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={spr.img} alt="" draggable={false} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-[13px] font-bold">
                  {spr.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {spr.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" aria-hidden="true" />
            )}
            {spr.badge && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-bold leading-none border border-white" aria-hidden="true">
                {spr.badge}
              </span>
            )}
            {spr.onFire && (
              <span className="absolute -top-1 -left-1 text-[11px]" aria-hidden="true">🔥</span>
            )}
          </div>
        ))}
      </div>

      {/* Hover / tap card — portaled so the scene never clips it. */}
      {mounted && hoverSprite && cardPos && createPortal(
        <div
          className="fixed z-[95] pointer-events-none -translate-x-1/2 -translate-y-full pb-2"
          style={{ left: cardPos.x, top: cardPos.y } as CSSProperties}
        >
          <div className="sa-orb-card min-w-[168px] max-w-[240px] rounded-2xl border border-white/70 bg-white/90 supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_14px_36px_-14px_rgba(60,48,42,0.45)] px-3.5 py-2.5 text-left">
            <p className="text-[13px] font-semibold text-foreground leading-tight">{hoverSprite.name}</p>
            {hoverSprite.sub && <p className="mt-0.5 text-[11px] text-foreground/55 leading-tight">{hoverSprite.sub}</p>}
            {hoverSprite.viewing && (
              <p className="mt-1 text-[10.5px] text-foreground/45">Viewing {hoverSprite.viewing}</p>
            )}
            <p className={`mt-1 text-[10.5px] font-semibold ${hoverSprite.online ? 'text-emerald-600' : 'text-foreground/40'}`}>
              {hoverSprite.kind === 'horse' ? 'On the ranch' : hoverSprite.online ? 'Online now' : 'Away'}
            </p>
            {/* Today's activity — count plus the most recent entries.
                Only staff/alumni carry the join; horses (and rows the
                enrichment hasn't reached yet) skip the block. */}
            {hoverSprite.actionsToday != null && (
              <div className="mt-1.5 pt-1.5 border-t border-black/10">
                <p className={`text-[10.5px] font-semibold ${hoverSprite.onFire ? 'text-amber-600' : hoverSprite.actionsToday > 0 ? 'text-foreground/65' : 'text-foreground/35'}`}>
                  {hoverSprite.actionsToday > 0
                    ? `${hoverSprite.onFire ? '🔥 ' : '⚡ '}${hoverSprite.actionsToday} action${hoverSprite.actionsToday === 1 ? '' : 's'} today`
                    : 'No actions yet today'}
                </p>
                {hoverSprite.recentActions.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {hoverSprite.recentActions.slice(0, 3).map((a, idx) => (
                      <li key={`${a.created_at}-${idx}`} className="text-[10px] text-foreground/55 leading-snug truncate">
                        <span className="text-foreground/35">{timeAgo(a.created_at)} · </span>
                        {humanizeActivityType(a.type)}
                        {a.target_label ? `: ${a.target_label}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      <style>{`
        .sa-orb-core {
          background: radial-gradient(circle at 38% 32%, rgba(255,244,235,0.95), rgba(250,222,201,0.85) 45%, rgba(160,82,45,0.22) 100%);
          box-shadow:
            0 0 22px 2px rgba(160,82,45,0.35),
            0 0 60px 8px rgba(160,82,45,0.18),
            inset 0 0 18px rgba(255,255,255,0.8);
          animation: sa-orb-breathe 5.5s ease-in-out infinite;
        }
        @keyframes sa-orb-breathe {
          0%, 100% { box-shadow: 0 0 22px 2px rgba(160,82,45,0.35), 0 0 60px 8px rgba(160,82,45,0.18), inset 0 0 18px rgba(255,255,255,0.8); }
          50% { box-shadow: 0 0 30px 4px rgba(160,82,45,0.5), 0 0 80px 14px rgba(160,82,45,0.26), inset 0 0 22px rgba(255,255,255,0.9); }
        }
        .sa-orb-highlight { box-shadow: 0 0 0 3px rgba(188,107,74,0.8), 0 0 18px 4px rgba(188,107,74,0.5); animation: sa-orb-pulse 1.6s ease-in-out infinite; }
        @keyframes sa-orb-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(188,107,74,0.8), 0 0 18px 4px rgba(188,107,74,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(188,107,74,0.45), 0 0 26px 8px rgba(188,107,74,0.3); }
        }
        @keyframes sa-orb-card-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .sa-orb-card { animation: sa-orb-card-in 0.16s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sa-orb-core, .sa-orb-highlight, .sa-orb-card { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
