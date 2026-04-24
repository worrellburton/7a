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

/* ── Phase 2: Animated logo entrance + drifting embers ─────────── */

/**
 * The logo enters with a scale-in from 0.88 → 1, a diagonal sheen sweeps
 * across the mark, and seven soft embers lift past it toward the top of
 * the frame (one per arrow). Pure CSS so we don't pay a framer-motion tax
 * on the pre-auth route. Reduced-motion freezes to a steady, lit state.
 */
function AnimatedLogo() {
  return (
    <div className="relative mx-auto mb-6 h-28 w-28 flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full ember-mote"
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

      <div className="relative animate-logo-in">
        <img
          src="/images/logo.png"
          alt="Seven Arrows Recovery"
          className="relative z-10 h-24 w-auto drop-shadow-2xl"
        />
        <span
          className="pointer-events-none absolute inset-0 animate-logo-shimmer"
          style={{
            background:
              'linear-gradient(115deg, transparent 35%, rgba(255,230,200,0.35) 50%, transparent 65%)',
            mixBlendMode: 'screen',
          }}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-[-20%] -z-0 rounded-full animate-logo-halo"
          style={{
            background:
              'radial-gradient(closest-side, rgba(216,137,102,0.45) 0%, rgba(188,107,74,0.15) 55%, transparent 80%)',
          }}
          aria-hidden="true"
        />
      </div>

      <style jsx global>{`
        @keyframes logo-in {
          0%   { opacity: 0; transform: scale(0.88) translateY(8px); filter: blur(4px); }
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
          0%,100% { opacity: 0.55; transform: scale(1); }
          50%     { opacity: 0.9;  transform: scale(1.08); }
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

/* ── Phase 4: Rotating quote / testimonial ribbon ───────────────── */

interface QuoteBeat {
  text: string;
  attribution?: string;
}

// Evergreen lines — if supabase is unreachable (or no team member has
// filled out `favorite_seven_arrows` yet), these keep the ribbon alive.
const BASE_QUOTES: QuoteBeat[] = [
  { text: 'Seven arrows. Seven virtues. One path home.', attribution: 'Seven Arrows Recovery' },
  { text: 'Courage, Prudence, Fortitude, Justice, Faith, Hope, Love.', attribution: 'The seven virtues' },
  { text: 'The horse will meet you exactly where you are.', attribution: 'Equine program' },
  { text: 'You do not have to do this alone.', attribution: 'Welcome home' },
];

/**
 * Pulls `favorite_seven_arrows` or `favorite_quote` from every public
 * team member and rotates them alongside the evergreen lines. Each
 * quote crossfades in/out on a 7s loop.
 */
function QuoteRibbon() {
  const [quotes, setQuotes] = useState<QuoteBeat[]>(BASE_QUOTES);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, favorite_quote, favorite_seven_arrows')
          .eq('status', 'active')
          .eq('public_team', true);
        if (error) throw error;
        if (cancelled || !data) return;
        const teamQuotes = (data as { full_name: string | null; favorite_quote: string | null; favorite_seven_arrows: string | null }[])
          .flatMap<QuoteBeat>((u) => {
            const out: QuoteBeat[] = [];
            if (u.favorite_seven_arrows && u.favorite_seven_arrows.trim()) {
              out.push({ text: u.favorite_seven_arrows.trim(), attribution: u.full_name || undefined });
            }
            if (u.favorite_quote && u.favorite_quote.trim()) {
              out.push({ text: u.favorite_quote.trim(), attribution: u.full_name || undefined });
            }
            return out;
          });
        // Interleave team quotes with base lines so visitors always see
        // at least one brand voice before the next team voice arrives.
        if (teamQuotes.length > 0) {
          const mixed: QuoteBeat[] = [];
          const maxLen = Math.max(teamQuotes.length, BASE_QUOTES.length);
          for (let i = 0; i < maxLen; i++) {
            if (teamQuotes[i]) mixed.push(teamQuotes[i]);
            if (BASE_QUOTES[i]) mixed.push(BASE_QUOTES[i]);
          }
          setQuotes(mixed);
        }
      } catch {
        // Silent — keep BASE_QUOTES.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % quotes.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, [quotes.length]);

  const current = quotes[idx % quotes.length] || quotes[0];

  return (
    <div
      key={idx}
      className="mt-1 mb-8 min-h-[4.5rem] animate-quote-in"
      aria-live="polite"
    >
      <p
        className="text-white/90 text-base sm:text-lg leading-snug font-light drop-shadow max-w-[28rem] mx-auto"
        style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}
      >
        &ldquo;{current.text}&rdquo;
      </p>
      {current.attribution && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/60">
          — {current.attribution}
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
  // regardless of team size.
  const seconds = Math.max(40, tiles.length * 3.5);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-6 z-[5] flex justify-center overflow-hidden"
      aria-hidden="true"
    >
      <div className="relative w-full max-w-5xl mx-auto px-4 animate-faces-fade-in">
        {/* Edge fades so avatars dissolve into the hero instead of hard-
            cropping at the viewport edge. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
             style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75), transparent)' }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
             style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.75), transparent)' }} />

        <div
          className="flex items-center gap-4 w-max face-marquee-track"
          style={{ animationDuration: `${seconds}s` }}
        >
          {loop.map((tile, i) => (
            <div
              key={`${tile.key}-${i}`}
              className="relative flex flex-col items-center shrink-0 group pointer-events-auto"
            >
              <div
                className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden ring-2 ring-white/40 shadow-lg transition-transform duration-300 group-hover:scale-110 face-tile-float"
                style={{ animationDelay: `${(i % 11) * 0.35}s` }}
              >
                <img
                  src={tile.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {tile.kind === 'horse' && (
                  <span className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-0.5">
                    <span className="text-[8px] tracking-widest text-white/90 uppercase">Herd</span>
                  </span>
                )}
              </div>
              <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-center">
                <div className="text-[11px] font-semibold text-white drop-shadow">{tile.name}</div>
                {tile.role && (
                  <div className="text-[10px] text-white/75 drop-shadow">{tile.role}</div>
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

export default function LoginScreen({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      <HeroGallery />
      <FaceMarquee />

      <div className="relative z-10 w-full max-w-md mx-4 text-center pb-32 sm:pb-28">
        <AnimatedLogo />
        <QuoteRibbon />
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
