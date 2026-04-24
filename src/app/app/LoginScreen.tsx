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

import { useEffect, useMemo, useState } from 'react';

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

export function HeroGallery({ onCaptionChange }: { onCaptionChange?: (c: HeroSlide['caption']) => void }) {
  const [idx, setIdx] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  // Preload the next image to avoid a flash.
  useEffect(() => {
    const next = HERO_SLIDES[(idx + 1) % HERO_SLIDES.length];
    const img = new Image();
    img.src = next.src;
  }, [idx]);

  // Advance the slide on a timer.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [idx]);

  // Publish the active caption up to the parent.
  useEffect(() => {
    onCaptionChange?.(HERO_SLIDES[idx].caption);
  }, [idx, onCaptionChange]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      {HERO_SLIDES.map((slide, i) => {
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
      <div className="absolute inset-0 pointer-events-none mix-blend-soft-light"
           style={{
             background:
               'linear-gradient(180deg, rgba(188,107,74,0.18) 0%, rgba(0,0,0,0) 40%, rgba(107,42,20,0.22) 100%)',
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

export default function LoginScreen({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  // Phase 1 shell — subsequent phases will layer logo animation, avatar
  // mosaic, quote ribbon, stats, and a delightful CTA on top.
  const caption = useMemo(() => HERO_SLIDES[0].caption, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      <HeroGallery />

      <div className="relative z-10 w-full max-w-sm mx-4 text-center">
        <img
          src="/images/logo.png"
          alt="Seven Arrows Recovery"
          className="h-24 w-auto mx-auto mb-6 drop-shadow-2xl"
        />
        {caption?.title && (
          <p
            className="text-white/90 text-lg font-light mb-10 drop-shadow-md"
            style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
          >
            {caption.title}
          </p>
        )}
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white text-gray-900 rounded-full py-3.5 px-6 text-sm font-semibold transition-all shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
