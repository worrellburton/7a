'use client';

/**
 * Seven Arrows — Cinematic Login Screen
 *
 * Phase 1: Ken-Burns crossfading hero gallery.
 *   • Slowly pans + zooms across our best facility / horse / ceremony photos.
 *   • Each slide rides a unique scale+translate curve so the pan never
 *     repeats the same trajectory back-to-back.
 *   • 10s per slide, 1.8s crossfade. Respects `prefers-reduced-motion`
 *     by freezing the pan/zoom (but still crossfades gently).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ── Hero slide deck ────────────────────────────────────────────── */

interface HeroSlide {
  src: string;
  // Ken-Burns transform keyframes — from/to scale & translate.
  from: { s: number; x: number; y: number };
  to:   { s: number; x: number; y: number };
  // Optional caption overlay (shown in Phase 4).
  caption?: { title: string; subtitle?: string };
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: '/images/group-sunset-desert.jpg',
    from: { s: 1.08, x: -2, y: -1 },
    to:   { s: 1.22, x:  3, y:  2 },
    caption: { title: 'A brotherhood forged at sunset.', subtitle: 'Seven Arrows Recovery' },
  },
  {
    src: '/images/horses-grazing.jpg',
    from: { s: 1.10, x:  2, y:  1 },
    to:   { s: 1.24, x: -3, y: -2 },
    caption: { title: 'The herd is waiting.', subtitle: 'Equine-assisted therapy' },
  },
  {
    src: '/images/sign-night-sky-milky-way.jpg',
    from: { s: 1.15, x:  0, y:  3 },
    to:   { s: 1.28, x:  0, y: -2 },
    caption: { title: 'Under a sky full of second chances.' },
  },
  {
    src: '/images/campfire-ceremony-circle.webp',
    from: { s: 1.12, x: -3, y:  2 },
    to:   { s: 1.26, x:  2, y: -1 },
    caption: { title: 'Ceremony. Circle. Come home.' },
  },
  {
    src: '/images/facility-exterior-mountains.jpg',
    from: { s: 1.06, x:  2, y: -2 },
    to:   { s: 1.20, x: -2, y:  2 },
    caption: { title: 'Where the mountains hold the work.' },
  },
  {
    src: '/images/equine-therapy-portrait.jpg',
    from: { s: 1.14, x:  0, y: -2 },
    to:   { s: 1.28, x:  0, y:  2 },
    caption: { title: 'Connection before conversation.' },
  },
  {
    src: '/images/covered-porch-desert-view.jpg',
    from: { s: 1.08, x:  3, y:  1 },
    to:   { s: 1.22, x: -3, y: -1 },
    caption: { title: 'Slow mornings. Long horizons.' },
  },
  {
    src: '/images/embrace-connection.jpg',
    from: { s: 1.10, x: -2, y:  2 },
    to:   { s: 1.24, x:  3, y: -2 },
    caption: { title: 'You are not doing this alone.' },
  },
];

const SLIDE_MS = 10_000;   // hold-time for each slide
const FADE_MS  = 1_800;    // crossfade duration

/* ── Hero gallery component ─────────────────────────────────────── */

export function HeroGallery({ onCaptionChange, theme }: {
  onCaptionChange?: (c: HeroSlide['caption']) => void;
  theme?: TimeTheme;
}) {
  const [idx, setIdx] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  // Reorder slides so the preferred ones for the current time-band come
  // first. Any slide not explicitly preferred falls to the end in its
  // original order.
  const slides = useMemo(() => {
    if (!theme) return HERO_SLIDES;
    const weight = (s: HeroSlide) => {
      const hit = theme.prefer.findIndex((p) => s.src.includes(p));
      return hit === -1 ? 99 + HERO_SLIDES.indexOf(s) : hit;
    };
    return [...HERO_SLIDES].sort((a, b) => weight(a) - weight(b));
  }, [theme]);

  // Preload the next image to avoid a flash.
  useEffect(() => {
    const next = slides[(idx + 1) % slides.length];
    const img = new Image();
    img.src = next.src;
  }, [idx, slides]);

  // Advance the slide on a timer.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [idx, slides.length]);

  // Publish the active caption up to the parent.
  useEffect(() => {
    onCaptionChange?.(slides[idx].caption);
  }, [idx, slides, onCaptionChange]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      {slides.map((slide, i) => {
        const active = i === idx;
        return (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity"
            style={{
              opacity: active ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)',
            }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover will-change-transform"
              style={{
                backgroundImage: `url(${slide.src})`,
                animation: reduceMotion
                  ? 'none'
                  : `kenburns-${i} ${SLIDE_MS + FADE_MS}ms ease-in-out forwards`,
                // Fallback static transform for reduced-motion so the image
                // still looks framed rather than 100% scale.
                transform: reduceMotion
                  ? `scale(${(slide.from.s + slide.to.s) / 2})`
                  : undefined,
              }}
            />
          </div>
        );
      })}

      {/* Warm color-grade + top/bottom vignette so the photos unify and the
          login card stays legible no matter which slide is up. */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             background:
               'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
           }}
      />
      <div className="absolute inset-0 pointer-events-none mix-blend-soft-light transition-[background] duration-[3000ms]"
           style={{
             background: theme?.tint
               ?? 'linear-gradient(180deg, rgba(188,107,74,0.18) 0%, rgba(0,0,0,0) 40%, rgba(107,42,20,0.22) 100%)',
           }}
      />

      {/* Keyframes for each slide. Declared inline so we don't bloat globals.css
          with one @keyframes per slide forever. */}
      <style jsx global>{`
        ${HERO_SLIDES.map((s, i) => `
          @keyframes kenburns-${i} {
            from { transform: scale(${s.from.s}) translate(${s.from.x}%, ${s.from.y}%); }
            to   { transform: scale(${s.to.s})   translate(${s.to.x}%,   ${s.to.y}%); }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
}

/* ── Phase 2: Animated logo entrance + drifting embers ─────────── */

/**
 * The mark is a wide 3176×865 PNG, so the container has to match its
 * aspect ratio or the `w-auto` width escapes the column and the logo
 * ghosts over the background.
 *
 * The old build layered a `mix-blend-mode: screen` shimmer on top of
 * the mark — beautiful on dark slides, but it bleached the logo out
 * completely when a light-skinned face crossfaded behind it. We now
 * render the shimmer behind the mark and drop a warm radial under it,
 * so the logo always sits on a clean pedestal regardless of slide.
 * Seven embers still rise (one per arrow). Reduced-motion freezes to
 * a steady, lit state.
 */
function AnimatedLogo() {
  return (
    <div className="relative mx-auto mb-4 sm:mb-6 w-[12.5rem] sm:w-[15rem] flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-1.5 rounded-full ember-mote"
            style={{
              background:
                'radial-gradient(circle, rgba(255,210,160,0.95) 0%, rgba(188,107,74,0.4) 55%, transparent 80%)',
              animationDelay: `${i * 0.45}s`,
              animationDuration: `${6 + (i % 3)}s`,
              ['--tx' as string]: `${(i - 3) * 9}px`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </div>

      {/* Warm vignette pedestal — always-on, no blend mode tricks. This
          is what keeps the mark legible when the hero crossfades through
          a light-skinned face. */}
      <span
        className="pointer-events-none absolute inset-[-35%] rounded-[50%] animate-logo-halo"
        style={{
          background:
            'radial-gradient(closest-side, rgba(10,6,4,0.55) 0%, rgba(10,6,4,0.35) 45%, rgba(10,6,4,0) 75%)',
          filter: 'blur(2px)',
        }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-[-25%] rounded-[50%]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(216,137,102,0.35) 0%, rgba(188,107,74,0.12) 55%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      <div className="relative animate-logo-in w-full">
        {/* Shimmer sits UNDER the mark so it can't wash the logo out. */}
        <span
          className="pointer-events-none absolute inset-0 animate-logo-shimmer rounded-full"
          style={{
            background:
              'linear-gradient(115deg, transparent 40%, rgba(255,230,200,0.45) 50%, transparent 60%)',
            filter: 'blur(6px)',
          }}
          aria-hidden="true"
        />
        <img
          src="/images/logo.png"
          alt="Seven Arrows Recovery"
          className="relative z-10 w-full h-auto"
          style={{
            // A strong dual drop-shadow lifts the mark off any slide.
            filter:
              'drop-shadow(0 2px 4px rgba(0,0,0,0.55)) drop-shadow(0 6px 18px rgba(0,0,0,0.5))',
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes logo-in {
          0%   { opacity: 0; transform: scale(0.92) translateY(8px); filter: blur(4px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .animate-logo-in { animation: logo-in 1.6s cubic-bezier(.2,.7,.2,1) both; }

        @keyframes logo-shimmer {
          0%   { transform: translateX(-120%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .animate-logo-shimmer { animation: logo-shimmer 6s ease-in-out 1.2s infinite; }

        @keyframes logo-halo {
          0%,100% { opacity: 0.8; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.04); }
        }
        .animate-logo-halo { animation: logo-halo 7s ease-in-out infinite; }

        @keyframes ember-rise {
          0%   { transform: translate(var(--tx, 0px), 0) scale(0.7); opacity: 0; }
          15%  { opacity: 0.95; }
          100% { transform: translate(var(--tx, 0px), -120px) scale(1.1); opacity: 0; }
        }
        .ember-mote {
          animation-name: ember-rise;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-logo-in,
          .animate-logo-shimmer,
          .animate-logo-halo,
          .ember-mote { animation: none !important; }
          .animate-logo-in { opacity: 1; transform: none; filter: none; }
          .ember-mote { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Phase 9: Time-of-day aware theme ───────────────────────────── */

type TimeBand = 'dawn' | 'day' | 'dusk' | 'night';

interface TimeTheme {
  band: TimeBand;
  greeting: string;
  // Colour tint stacked over the hero (soft-light blend).
  tint: string;
  // Which hero slides to prioritize first (match by substring of src).
  prefer: string[];
}

function timeBand(hour: number): TimeBand {
  if (hour >= 5 && hour < 8)  return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const TIME_THEMES: Record<TimeBand, TimeTheme> = {
  dawn: {
    band: 'dawn',
    greeting: 'Good morning.',
    tint: 'linear-gradient(180deg, rgba(255,180,120,0.28) 0%, rgba(255,220,180,0.08) 45%, rgba(40,20,30,0.25) 100%)',
    prefer: ['covered-porch', 'facility-exterior', 'horses-grazing'],
  },
  day: {
    band: 'day',
    greeting: 'Welcome back.',
    tint: 'linear-gradient(180deg, rgba(255,220,170,0.10) 0%, rgba(0,0,0,0) 35%, rgba(80,40,30,0.18) 100%)',
    prefer: ['facility-exterior', 'horses-grazing', 'embrace', 'equine-therapy'],
  },
  dusk: {
    band: 'dusk',
    greeting: 'Good evening.',
    tint: 'linear-gradient(180deg, rgba(255,140,80,0.32) 0%, rgba(255,110,90,0.10) 45%, rgba(40,10,30,0.35) 100%)',
    prefer: ['group-sunset', 'campfire', 'covered-porch'],
  },
  night: {
    band: 'night',
    greeting: 'Welcome home.',
    tint: 'linear-gradient(180deg, rgba(30,20,60,0.40) 0%, rgba(10,10,30,0.25) 45%, rgba(60,30,20,0.40) 100%)',
    prefer: ['sign-night-sky', 'campfire', 'group-sunset'],
  },
};

function useTimeTheme(): TimeTheme {
  const [band, setBand] = useState<TimeBand>(() => {
    // During SSR we default to "day" to avoid hydration mismatches; the
    // effect below corrects it on the client.
    if (typeof window === 'undefined') return 'day';
    return timeBand(new Date().getHours());
  });
  useEffect(() => {
    setBand(timeBand(new Date().getHours()));
    // Re-check every 5 minutes in case someone leaves the screen open
    // across the boundary between dusk and night.
    const t = window.setInterval(() => {
      setBand(timeBand(new Date().getHours()));
    }, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  return TIME_THEMES[band];
}

/* ── Phase 8: Ambient ember + dust canvas ───────────────────────── */

/**
 * A light canvas layer that spawns warm dust motes and embers drifting
 * up across the screen with a gentle horizontal wobble. On desktop the
 * cursor acts as a soft repulsion field — nudges particles out of the
 * way as it moves. Mobile skips the interaction handlers and runs a
 * reduced particle count. `prefers-reduced-motion` disables the layer
 * entirely (we return early, no canvas mounted).
 */
function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isSmall = window.matchMedia('(max-width: 640px)').matches;
    const COUNT = isSmall ? 28 : 60;

    interface Mote {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      hue: 'ember' | 'dust';
      phase: number;
      life: number;
    }

    const motes: Mote[] = [];
    let w = 0, h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const spawn = (bottomOnly = false): Mote => ({
      x: rand(0, w),
      y: bottomOnly ? h + rand(0, 40) : rand(0, h),
      vx: rand(-0.1, 0.1),
      vy: rand(-0.45, -0.15),
      r: rand(0.7, 2.4),
      hue: Math.random() < 0.3 ? 'ember' : 'dust',
      phase: Math.random() * Math.PI * 2,
      life: 1,
    });

    for (let i = 0; i < COUNT; i++) motes.push(spawn());

    // Cursor repulsion field (desktop only — mobile skips pointermove).
    const pointer = { x: -9999, y: -9999, active: false };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(32, now - last); // clamp if tab was backgrounded
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];

        // Sinusoidal wobble on the x-axis so motion doesn't look linear.
        m.phase += dt * 0.0012;
        m.x += m.vx + Math.sin(m.phase) * 0.25;
        m.y += m.vy * (dt / 16);

        // Cursor repulsion — only active on pointer devices.
        if (pointer.active) {
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            const d = Math.sqrt(d2) || 1;
            const push = (1 - d / 120) * 0.8;
            m.x += (dx / d) * push;
            m.y += (dy / d) * push;
          }
        }

        // Respawn when offscreen.
        if (m.y < -20 || m.x < -20 || m.x > w + 20) {
          motes[i] = spawn(true);
          continue;
        }

        const alpha = m.hue === 'ember'
          ? 0.6 + Math.sin(m.phase * 2) * 0.3
          : 0.25 + Math.sin(m.phase) * 0.1;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        if (m.hue === 'ember') {
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
          g.addColorStop(0, `rgba(255,210,150,${alpha})`);
          g.addColorStop(0.45, `rgba(216,137,102,${alpha * 0.5})`);
          g.addColorStop(1, 'rgba(188,107,74,0)');
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = `rgba(245,240,230,${alpha})`;
        }
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[2]"
      aria-hidden="true"
    />
  );
}

/* ── Phase 4: Rotating quote / testimonial ribbon ───────────────── */

// A beat is a single rotation slot. Three sources, one shape, one label
// above each quote so visitors know whether they're reading a verified
// review, a staff-chosen quote, or a staff pick of what they love here.
type BeatKind = 'review' | 'quote' | 'pick';

interface Beat {
  id: string;
  kind: BeatKind;
  text: string;
  author: string | null;
  byline: string | null;
}

interface LoginContent {
  reviews: { id: string; text: string; author: string; byline: string; rating: number; source: 'google' | 'curated' }[];
  staffQuotes: { id: string; text: string; author: string | null; role: string | null }[];
  staffPicks:  { id: string; text: string; author: string | null; role: string | null }[];
}

const KIND_LABEL: Record<BeatKind, string> = {
  review: 'What alumni say',
  quote:  'Staff favorite quote',
  pick:   'What our team loves about 7A',
};

// Interleave three lists so we never stack two items from the same
// source back-to-back. Order = review → quote → pick → review… and any
// source that empties first just gets skipped.
function interleave(content: LoginContent): Beat[] {
  const reviews: Beat[] = content.reviews.map((r) => ({
    id: r.id,
    kind: 'review',
    text: r.text,
    author: r.author,
    byline: r.byline,
  }));
  const quotes: Beat[] = content.staffQuotes.map((q) => ({
    id: q.id,
    kind: 'quote',
    text: q.text,
    author: q.author,
    byline: q.role,
  }));
  const picks: Beat[] = content.staffPicks.map((p) => ({
    id: p.id,
    kind: 'pick',
    text: p.text,
    author: p.author,
    byline: p.role,
  }));

  const out: Beat[] = [];
  const maxLen = Math.max(reviews.length, quotes.length, picks.length);
  for (let i = 0; i < maxLen; i++) {
    if (reviews[i]) out.push(reviews[i]);
    if (quotes[i])  out.push(quotes[i]);
    if (picks[i])   out.push(picks[i]);
  }
  return out;
}

/**
 * Fetches real reviews + staff-chosen quotes + staff "what I love about
 * 7A" picks from /api/public/login-content and rotates one every 7s.
 * No evergreen/boilerplate fallback — if the DB has nothing to say, the
 * ribbon stays empty rather than inventing marketing copy.
 */
function QuoteRibbon() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/login-content', { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as LoginContent;
        if (cancelled) return;
        setBeats(interleave(data));
      } catch (err) {
        // Log once so we can see degraded loads in the console, but keep
        // the ribbon silent rather than falling back to invented copy.
        console.warn('[LoginScreen] review/quote fetch failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (beats.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % beats.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, [beats.length]);

  if (beats.length === 0) {
    // Reserve the vertical space so the layout doesn't jump when the
    // fetch resolves — but render nothing until we have real content.
    return <div className="mt-1 mb-8 min-h-[5.5rem]" aria-hidden="true" />;
  }

  const current = beats[idx % beats.length];
  const attribution =
    current.author && current.byline
      ? `${current.author} · ${current.byline}`
      : current.author || current.byline || null;

  return (
    <div
      key={current.id}
      className="mt-1 mb-8 min-h-[5.5rem] animate-quote-in"
      aria-live="polite"
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/55 mb-2">
        {KIND_LABEL[current.kind]}
      </p>
      <p
        className="text-white/95 text-sm sm:text-lg leading-snug font-light drop-shadow max-w-[30rem] mx-auto px-2"
        style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
      >
        &ldquo;{current.text}&rdquo;
      </p>
      {attribution && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/65">
          — {attribution}
        </p>
      )}
      <style jsx global>{`
        @keyframes quote-in {
          0%   { opacity: 0; transform: translateY(6px); filter: blur(3px); }
          35%  { opacity: 1; filter: blur(0); }
          70%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-quote-in { animation: quote-in 900ms cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-quote-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Phase 3: Staff & horse face mosaic ─────────────────────────── */

interface FaceTile {
  key: string;
  name: string;
  role: string | null;
  src: string;
  kind: 'staff' | 'horse';
}

// Google avatar URLs take a =s96-c suffix that renders blurry at 56px on
// retina; bump to s256 so the mosaic reads crisp.
function upgradeGoogleAvatar(url: string | null): string | null {
  if (!url) return null;
  if (!/googleusercontent\.com/i.test(url)) return url;
  if (/=s\d+(-c)?$/i.test(url)) return url.replace(/=s\d+(-c)?$/i, '=s256-c');
  return `${url}=s256-c`;
}

// Two horse photos ship in /public/images and stand in for the equine
// table (which is auth-gated and can't be read pre-login).
const HORSE_TILES: FaceTile[] = [
  { key: 'horse-portrait', name: 'The herd', role: 'Equine therapy', src: '/images/equine-therapy-portrait.jpg', kind: 'horse' },
  { key: 'horse-grazing',  name: 'Grazing',  role: 'Morning pasture', src: '/images/horses-grazing.jpg', kind: 'horse' },
];

/**
 * Fetches the public team (status = active, public_team = true) from the
 * browser supabase client — same RLS policy `fetchPublicTeam()` uses on
 * the marketing site, so anon reads are permitted. Falls back silently
 * to just the horse tiles if the query fails (e.g. env misconfig).
 */
function useFaceTiles(): FaceTile[] {
  const [staff, setStaff] = useState<FaceTile[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, job_title')
          .eq('status', 'active')
          .eq('public_team', true);
        if (error) throw error;
        if (cancelled || !data) return;
        const tiles = (data as { id: string; full_name: string | null; avatar_url: string | null; job_title: string | null }[])
          .filter((u) => u.avatar_url && u.full_name)
          .map<FaceTile>((u) => ({
            key: u.id,
            name: u.full_name || 'Team',
            role: u.job_title,
            src: upgradeGoogleAvatar(u.avatar_url) || u.avatar_url || '',
            kind: 'staff',
          }));
        setStaff(tiles);
      } catch {
        // Silent fallback — the mosaic still shows horses.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Interleave horses into the staff list so the marquee mixes species.
  return useMemo(() => {
    if (staff.length === 0) return HORSE_TILES;
    const mixed: FaceTile[] = [];
    staff.forEach((s, i) => {
      mixed.push(s);
      if (i === Math.floor(staff.length / 3)) mixed.push(HORSE_TILES[0]);
      if (i === Math.floor((2 * staff.length) / 3)) mixed.push(HORSE_TILES[1]);
    });
    return mixed;
  }, [staff]);
}

/**
 * A slow horizontal marquee of team + horse faces at the bottom of the
 * screen. Each tile is a round avatar with an orange ring; hover pauses
 * the scroll and fades in the name + role. The strip duplicates itself
 * once so the scroll loops seamlessly. Fully hidden on prefers-reduced-
 * motion (it still renders but stops scrolling — keeps the visual).
 */
function FaceMarquee() {
  const tiles = useFaceTiles();

  // We render the list twice back-to-back so translate(-50%) produces a
  // seamless loop. A longer list = slower per-tile sweep, which feels
  // intentional (there are many people here, take your time).
  const loop = useMemo(() => [...tiles, ...tiles], [tiles]);

  if (tiles.length === 0) return null;

  // Duration scales with tile count so velocity stays roughly constant
  // regardless of team size (~4.5s per tile, floored so tiny teams
  // don't zip past the viewer).
  const seconds = Math.max(55, tiles.length * 4.5);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[5] flex justify-center overflow-hidden"
      style={{ bottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))' }}
      aria-hidden="true"
    >
      {/* Reserve enough vertical room for the circle + hover caption so the
          floating tiles don't clip against the bottom edge of the screen.
          Edge fade is applied via mask-image on the track itself so tiles
          fade to transparent — overlaying a dark gradient was painting
          square shadows over the round avatars at the edges. */}
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 animate-faces-fade-in py-3">
        <div
          className="flex items-center gap-4 sm:gap-6 w-max face-marquee-track py-2"
          style={{
            animationDuration: `${seconds}s`,
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, black 7%, black 93%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0, black 7%, black 93%, transparent 100%)',
          }}
        >
          {loop.map((tile, i) => (
            <div
              key={`${tile.key}-${i}`}
              className="relative flex flex-col items-center shrink-0 group pointer-events-auto"
            >
              <div
                className="relative aspect-square h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full overflow-hidden ring-2 ring-white/60 shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110 face-tile-float bg-warm-bg/60"
                style={{ animationDelay: `${(i % 11) * 0.35}s` }}
              >
                <img
                  src={tile.src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover rounded-full"
                />
                {tile.kind === 'horse' && (
                  <span className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center pb-0.5">
                    <span className="text-[8px] tracking-widest text-white/95 uppercase">Herd</span>
                  </span>
                )}
              </div>
              <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-center">
                <div className="text-[11px] font-semibold text-white drop-shadow">{tile.name}</div>
                {tile.role && (
                  <div className="text-[10px] text-white/80 drop-shadow">{tile.role}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes face-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .face-marquee-track {
          animation-name: face-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .face-marquee-track:hover { animation-play-state: paused; }

        @keyframes face-tile-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-3px); }
        }
        .face-tile-float {
          animation: face-tile-float 4.5s ease-in-out infinite;
        }

        @keyframes faces-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-faces-fade-in { animation: faces-fade-in 1.4s ease-out 0.8s both; }

        @media (prefers-reduced-motion: reduce) {
          .face-marquee-track,
          .face-tile-float,
          .animate-faces-fade-in { animation: none !important; }
          .animate-faces-fade-in { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

/* ── Motion preference hook ─────────────────────────────────────── */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export { usePrefersReducedMotion };

/* ── Main login screen ──────────────────────────────────────────── */

/* ── Phase 6: Delightful Google CTA with loading handshake ─────── */

function GoogleGlyph() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SignInButton({ onSignIn }: { onSignIn: () => void }) {
  // Once the user clicks we can't predict how long Google's OAuth
  // redirect will take — stay in "loading" until unmount. That keeps
  // the CTA from bouncing back to its idle state if the redirect
  // stalls a few hundred ms.
  const [loading, setLoading] = useState(false);

  const handle = () => {
    if (loading) return;
    setLoading(true);
    try {
      onSignIn();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative animate-cta-in">
      {/* Warm glow halo — pulses behind the button so it looks "on". */}
      <div
        className="pointer-events-none absolute -inset-2 rounded-full blur-xl cta-glow"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,180,130,0.55), rgba(188,107,74,0.25) 55%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      {/* Rotating gradient border. Achieved with two stacked rings —
          outer conic-gradient spins, inner white ring masks the middle
          so only a 1.5px edge shows through. */}
      <div className="relative rounded-full p-[1.5px] overflow-hidden">
        <span
          className="pointer-events-none absolute inset-[-50%] cta-ring"
          style={{
            background:
              'conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC05, #34A853, #4285F4)',
          }}
          aria-hidden="true"
        />
        <button
          onClick={handle}
          disabled={loading}
          aria-label={loading ? 'Redirecting to Google' : 'Sign in with Google'}
          className="group relative w-full flex items-center justify-center gap-3 bg-white rounded-full py-3.5 px-6 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] disabled:opacity-90 disabled:cursor-wait"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Subtle sheen sweep on hover. */}
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-[400%]" />
          </span>

          {loading ? (
            <>
              <span className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
              <span className="tracking-wide">Signing you in…</span>
            </>
          ) : (
            <>
              <GoogleGlyph />
              <span className="tracking-wide">Continue with Google</span>
              <svg
                className="w-3.5 h-3.5 -mr-1 transition-transform duration-300 group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-white/60 tracking-wide">
        Staff & family access only. Protected by Google OAuth.
      </p>

      <style jsx global>{`
        @keyframes cta-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-cta-in { animation: cta-in 900ms cubic-bezier(.2,.7,.2,1) 600ms both; }

        @keyframes cta-glow {
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 0.9;  transform: scale(1.04); }
        }
        .cta-glow { animation: cta-glow 3.6s ease-in-out infinite; }

        @keyframes cta-ring-spin {
          to { transform: rotate(360deg); }
        }
        .cta-ring {
          animation: cta-ring-spin 6s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-cta-in,
          .cta-glow,
          .cta-ring { animation: none !important; }
          .animate-cta-in { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

export default function LoginScreen({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  const theme = useTimeTheme();
  return (
    <main
      role="main"
      aria-label="Seven Arrows Recovery sign-in"
      className="w-full flex items-center justify-center relative overflow-hidden bg-black"
      style={{
        // `100svh` keeps the screen steady while iOS Safari's URL chrome
        // slides — `min-h-screen` (=100vh) overshoots and leaves a black
        // strip under the marquee.
        minHeight: '100svh',
      }}
    >
      {/* Preload the first hero image so the screen paints with a
          finished photo instead of a black frame on cold loads. */}
      <link rel="preload" as="image" href={HERO_SLIDES[0].src} />

      <HeroGallery theme={theme} />
      <AmbientParticles />
      <FaceMarquee />

      <section
        aria-label="Sign in"
        className="relative z-10 w-full max-w-md mx-4 text-center"
        style={{
          // Reserve room for the taller marquee strip (4.5rem circles +
          // hover caption + 1.75rem bottom offset) and respect the home
          // indicator on notched devices.
          paddingBottom: 'calc(10rem + env(safe-area-inset-bottom, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <p
          className="text-white/70 text-[11px] uppercase tracking-[0.32em] mb-3 animate-greeting-in"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {theme.greeting}
        </p>
        <AnimatedLogo />
        <QuoteRibbon />
        <SignInButton onSignIn={onSignIn} />
        <style jsx global>{`
          @keyframes greeting-in {
            from { opacity: 0; letter-spacing: 0.5em; }
            to   { opacity: 1; letter-spacing: 0.32em; }
          }
          .animate-greeting-in { animation: greeting-in 1.4s cubic-bezier(.2,.7,.2,1) 0.2s both; }
          @media (prefers-reduced-motion: reduce) {
            .animate-greeting-in { animation: none !important; opacity: 1; }
          }
        `}</style>
      </section>
    </main>
  );
}
