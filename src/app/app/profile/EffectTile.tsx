'use client';

// Live picker tile rendered inside each cursor-effect swatch on
// /app/profile → Cursor. Replaces the static CSS sketches with a
// fully animated mini-cursor that traces an ellipse inside the
// tile, generates a real trail buffer, and runs the same per-effect
// decoration logic as the live preview surface above the picker.
// Selected tile gets a faster path + bigger head + a soft inner
// glow so the user can see at a glance which effect they're on.
//
// Each tile owns its own rAF loop, scoped to ResizeObserver-tracked
// dimensions so the path always fills the available canvas. The
// loop exits when the tile unmounts.

import { useEffect, useRef, useState } from 'react';
import { type CursorEffect, CURSOR_EFFECTS } from '@/lib/cursor-effects';

interface TilePathPoint {
  x: number;
  y: number;
  t: number;
}

interface UseTilePathArgs {
  width: number;
  height: number;
  /** 1 = idle, ~1.4 when selected, ~1.15 when hovered. Speeds up
   *  the cursor sweep and produces a slightly longer trail. */
  speedMultiplier: number;
  /** Per-effect phase offset so all 10 tiles don't sync up — the
   *  grid reads as ten independent cursors instead of one repeated
   *  animation. */
  phaseSeed: number;
}

/**
 * Drives a virtual cursor along an ellipse + figure-8-ish y-curve
 * inside the tile, returning the latest position, a small trail
 * ring buffer, and an elapsed clock. Trail-based effects (flame,
 * comet, lightning, dots, bubbles) read the trail; time-based
 * effects (sparkle, rainbow, pulse, glow) read the clock.
 */
function useTilePath({ width, height, speedMultiplier, phaseSeed }: UseTilePathArgs) {
  const [pos, setPos] = useState({ x: width / 2, y: height / 2 });
  const [trail, setTrail] = useState<TilePathPoint[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (width === 0 || height === 0) return;
    let raf = 0;
    const start = performance.now();
    let lastTrail = 0;
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      // Angular speed — 0.55 rad/s baseline, scaled by the multiplier
      // so a selected tile orbits ~40% faster.
      const angle = elapsed * 0.55 * speedMultiplier + phaseSeed;
      // Padded ellipse so the head + decoration never clip the
      // tile's rounded corners. Padding scales with size so a
      // small tile gets less padding (cursor still has room) and
      // a large tile gets more (cursor doesn't hug the wall).
      const padX = Math.min(22, width * 0.20);
      const padY = Math.min(20, height * 0.22);
      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.max(4, width / 2 - padX);
      const ry = Math.max(4, height / 2 - padY);
      // 1.3x y-frequency so the path is a smooth figure-8 rather
      // than a perfect circle — trails look more interesting and
      // the head changes direction enough to look "alive" at idle
      // speeds.
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle * 1.3) * ry;
      setPos({ x, y });
      setNow(elapsed);
      // Trail samples at ~30fps so the buffer doesn't fill in 200ms.
      if (t - lastTrail > 33) {
        lastTrail = t;
        setTrail((prev) => [...prev, { x, y, t }].slice(-10));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [width, height, speedMultiplier, phaseSeed]);

  return { x: pos.x, y: pos.y, trail, now };
}

interface EffectTileProps {
  effect: CursorEffect;
  color: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  /** True when this is the currently-selected effect. Tile gets a
   *  larger head, faster path, brighter colour saturation. */
  active: boolean;
}

export default function EffectTile({
  effect,
  color,
  avatarUrl,
  displayName,
  active,
}: EffectTileProps) {
  const tint = color ?? '#bc6b4a';
  const initial = (displayName || '?').trim().charAt(0).toUpperCase() || '?';

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ResizeObserver so the path adapts to whatever space the grid
  // gives the tile (different at 2-col vs 5-col breakpoints, and
  // when the tile gains/loses the active scale-up).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Per-effect phase offset so the 10 tiles don't tick in unison.
  const phaseSeed = Math.max(0, CURSOR_EFFECTS.findIndex((e) => e.id === effect.id)) * 0.65;
  const speedMul = active ? 1.4 : 1;
  const { x, y, trail, now } = useTilePath({
    width: size.w,
    height: size.h,
    speedMultiplier: speedMul,
    phaseSeed,
  });

  const headSize = active ? 20 : 16;
  const ringWidth = active ? 2 : 1.5;
  const haloAlpha = active ? 'cc' : '88';

  // The cursor head — actual user avatar where available, falling
  // back to a colour-tinted initial. Position is driven by the
  // path hook; ring + halo strength scale up when the tile is
  // selected so the active state reads at a glance.
  const head = avatarUrl ? (
    <span
      aria-hidden="true"
      className="absolute rounded-full overflow-hidden pointer-events-none"
      style={{
        left: x,
        top: y,
        width: headSize,
        height: headSize,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 0 ${ringWidth}px ${tint}, 0 0 8px ${tint}${haloAlpha}`,
        transition: 'width 200ms ease, height 200ms ease, box-shadow 200ms ease',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt=""
        width={headSize}
        height={headSize}
        className="block w-full h-full object-cover"
      />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="absolute rounded-full pointer-events-none text-white font-bold flex items-center justify-center"
      style={{
        left: x,
        top: y,
        width: headSize,
        height: headSize,
        transform: 'translate(-50%, -50%)',
        backgroundColor: tint,
        fontSize: active ? 11 : 9,
        boxShadow: `0 0 0 ${ringWidth}px #ffffff, 0 0 8px ${tint}${haloAlpha}`,
        transition: 'width 200ms ease, height 200ms ease, box-shadow 200ms ease, font-size 200ms ease',
      }}
    >
      {initial}
    </span>
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Decoration
        mode={effect.thumb.mode}
        tint={tint}
        x={x}
        y={y}
        trail={trail}
        now={now}
        size={size}
        active={active}
      />
      {head}
    </div>
  );
}

interface DecorationProps {
  mode: CursorEffect['thumb']['mode'];
  tint: string;
  x: number;
  y: number;
  trail: TilePathPoint[];
  now: number;
  size: { w: number; h: number };
  active: boolean;
}

/**
 * Effect-specific decoration that sits BEHIND the cursor head, one
 * branch per `mode`. Logic mirrors the live preview / PresenceCursors
 * render path so what users see in the picker tile is what they get
 * shipped over the realtime channel.
 */
function Decoration({ mode, tint, x, y, trail, now, size, active }: DecorationProps) {
  // Phase 4 — classic. Bare cursor + a small "You" label tucked
  // next to the head. The label tracks the head so it doesn't get
  // stranded as the cursor sweeps the tile.
  if (mode === 'classic') {
    return (
      <span
        aria-hidden="true"
        className="absolute pointer-events-none px-1 py-px rounded text-white text-[8px] font-semibold whitespace-nowrap"
        style={{
          left: x + (active ? 12 : 10),
          top: y - 4,
          backgroundColor: tint,
          fontFamily: 'var(--font-body)',
          boxShadow: `0 1px 2px ${tint}55`,
        }}
      >
        You
      </span>
    );
  }

  // Phase 4 — flame. Heat-graded radial particles along the trail
  // plus a small candle-flame body anchored to the cursor.
  if (mode === 'flame') {
    return (
      <>
        {trail.slice(0, -1).map((pt, i, arr) => {
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          const alpha = indexNorm * 0.7;
          const sz = 4 + indexNorm * 6 + (active ? 2 : 0);
          const heat = indexNorm;
          const core = heat > 0.66 ? '#ffffff' : heat > 0.33 ? '#fde68a' : '#f97316';
          const mid = heat > 0.66 ? '#fde68a' : heat > 0.33 ? '#fbbf24' : '#dc2626';
          const edge = heat > 0.5 ? tint : '#7c2d12';
          return (
            <span
              key={pt.t}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: pt.x,
                top: pt.y,
                width: sz,
                height: sz,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${core} 0%, ${mid} 35%, ${edge} 70%, transparent 100%)`,
                opacity: alpha,
                filter: `blur(${1 + indexNorm}px)`,
                mixBlendMode: 'screen',
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 5 — comet. Tapered solid-tint tail along the trail.
  if (mode === 'comet') {
    return (
      <>
        {trail.slice(0, -1).map((pt, i, arr) => {
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          const sz = 3 + indexNorm * 8 + (active ? 1 : 0);
          const alpha = indexNorm * 0.6;
          return (
            <span
              key={pt.t}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: pt.x,
                top: pt.y,
                width: sz,
                height: sz,
                transform: 'translate(-50%, -50%)',
                background: tint,
                opacity: alpha,
                filter: 'blur(1.5px)',
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 5 — lightning. Zigzag short bolt with alternating ±skew.
  if (mode === 'lightning') {
    return (
      <>
        {trail.slice(0, -1).map((pt, i, arr) => {
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          const skew = i % 2 === 0 ? -3 : 3;
          const alpha = indexNorm * 0.85;
          return (
            <span
              key={pt.t}
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                left: pt.x + skew,
                top: pt.y + skew,
                width: 6,
                height: 2,
                transform: 'translate(-50%, -50%)',
                background: tint,
                opacity: alpha,
                borderRadius: 2,
                boxShadow: `0 0 ${active ? 6 : 4}px ${tint}`,
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 5 — dots. Plain fading-circle trail.
  if (mode === 'dots') {
    return (
      <>
        {trail.slice(0, -1).map((pt, i, arr) => {
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          const sz = 3 + indexNorm * 3;
          const alpha = indexNorm * 0.65;
          return (
            <span
              key={pt.t}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: pt.x,
                top: pt.y,
                width: sz,
                height: sz,
                transform: 'translate(-50%, -50%)',
                background: tint,
                opacity: alpha,
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 6 — sparkle. Four sparkles orbiting the cursor, phased
  // off the elapsed clock so they pulse in/out as they rotate.
  if (mode === 'sparkle') {
    const t = now * 2.6;
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const radius = active ? 12 : 9;
    return (
      <>
        {angles.map((a, i) => {
          const r = radius + Math.sin(t + i) * 3;
          const dx = Math.cos(a + t * 0.4) * r;
          const dy = Math.sin(a + t * 0.4) * r;
          const alpha = 0.45 + 0.55 * Math.sin(t * 1.5 + i);
          return (
            <span
              key={i}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: x + dx,
                top: y + dy,
                width: 4,
                height: 4,
                transform: 'translate(-50%, -50%)',
                background: tint,
                opacity: alpha,
                boxShadow: `0 0 ${active ? 6 : 4}px ${tint}`,
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 6 — bubbles. Bubbles rise upward from each historical
  // trail point with horizontal wobble. Age-based opacity + scale.
  if (mode === 'bubbles') {
    return (
      <>
        {trail.slice(0, -1).map((pt, i, arr) => {
          // Age based on indexNorm so we don't fight the rAF clock —
          // newer points have lower age, older points have higher.
          const indexNorm = (i + 1) / Math.max(1, arr.length);
          const age = 1 - indexNorm;
          if (age > 1) return null;
          const rise = age * (active ? 22 : 16);
          const wobble = Math.sin(age * 6 + i) * 4;
          const sz = 4 + age * 5;
          const alpha = (1 - age) * 0.55;
          return (
            <span
              key={pt.t}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: pt.x + wobble,
                top: pt.y - rise,
                width: sz,
                height: sz,
                transform: 'translate(-50%, -50%)',
                background: tint,
                opacity: alpha,
                boxShadow: `inset 0 0 3px rgba(255,255,255,0.5)`,
              }}
            />
          );
        })}
      </>
    );
  }

  // Phase 7 — glow. Single soft halo behind the cursor, breathing
  // via a sine on the elapsed clock instead of a CSS keyframe so
  // the rate scales with active speed.
  if (mode === 'glow') {
    const breath = 0.55 + 0.3 * Math.sin(now * (active ? 2.4 : 1.6));
    const haloSize = (active ? 48 : 36) + Math.sin(now * 1.3) * 4;
    return (
      <span
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          left: x,
          top: y,
          width: haloSize,
          height: haloSize,
          transform: 'translate(-50%, -50%)',
          background: tint,
          filter: 'blur(10px)',
          opacity: breath,
        }}
      />
    );
  }

  // Phase 7 — rainbow. Hue-cycling halo behind the avatar (the
  // avatar itself stays photographic; the multi-hue identity comes
  // from the halo).
  if (mode === 'rainbow') {
    const hue = ((now * 60) % 360 + 360) % 360;
    const haloSize = (active ? 32 : 26);
    return (
      <span
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          left: x,
          top: y,
          width: haloSize,
          height: haloSize,
          transform: 'translate(-50%, -50%)',
          background: `hsl(${hue}, 85%, 60%)`,
          filter: 'blur(5px)',
          opacity: 0.75,
        }}
      />
    );
  }

  // Phase 7 — pulse. Two concentric expanding rings phased half a
  // cycle apart, anchored to the live cursor position so they
  // expand from wherever it currently is.
  if (mode === 'pulse') {
    const period = active ? 1.4 : 1.8;
    const baseSize = 6;
    const maxSize = Math.min(size.w, size.h) * 0.7;
    return (
      <>
        {[0, 0.5].map((offset, i) => {
          const phase = ((now / period + offset) % 1);
          const sz = baseSize + phase * (maxSize - baseSize);
          const alpha = (1 - phase) * 0.7;
          return (
            <span
              key={i}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                left: x,
                top: y,
                width: sz,
                height: sz,
                transform: 'translate(-50%, -50%)',
                border: `1.5px solid ${tint}`,
                opacity: alpha,
              }}
            />
          );
        })}
      </>
    );
  }

  return null;
}
