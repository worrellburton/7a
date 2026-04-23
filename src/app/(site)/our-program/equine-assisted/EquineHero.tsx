'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Equine-Assisted — cinematic hero.
 *
 * Uses the "horses at the rail" Supabase-hosted clip as a looping
 * backdrop, a keyword-rich H1 ("Equine-Assisted Psychotherapy at a
 * 160-acre Arizona ranch"), breadcrumbs, and an animated SVG
 * horse-silhouette seal that gallops into place on mount. Designed
 * for both SEO (entity-dense text) and GEO (AI crawlers pick the
 * first two sentences as a standalone answer).
 */
export default function EquineHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="equine-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      <video
        ref={videoRef}
        src={siteVideos.horsesRail}
        poster="/images/equine-therapy-portrait.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,6,4,0.55) 0%, rgba(12,6,4,0.4) 30%, rgba(12,6,4,0.62) 70%, rgba(12,6,4,0.92) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 55% at 82% 55%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[74vh] lg:min-h-[82vh] pb-20 lg:pb-24 flex flex-col justify-end">
          <nav
            aria-label="Breadcrumb"
            className="mb-7 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <ol className="flex items-center gap-2 flex-wrap">
              <li>
                <Link href="/" className="transition-colors hover:text-white" style={{ color: 'var(--color-accent)' }}>Home</Link>
              </li>
              <li className="text-white/40">/</li>
              <li>
                <Link href="/our-program" className="transition-colors hover:text-white" style={{ color: 'var(--color-accent)' }}>Our Program</Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80">Equine-Assisted Psychotherapy</li>
            </ol>
          </nav>

          <div className="flex items-start gap-7 lg:gap-10">
            <AnimatedHorseSeal mounted={mounted} />

            <div className="flex-1">
              <p
                className="flex items-center gap-4 text-[11px] tracking-[0.24em] uppercase font-semibold text-white/85 mb-5"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s',
                }}
              >
                <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
                Equine-Assisted Psychotherapy (EAP)
              </p>

              <h1
                id="equine-hero-heading"
                className="font-bold tracking-tight leading-[0.98]"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(22px)',
                  transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
                }}
              >
                The horses don&rsquo;t care about your <em className="not-italic" style={{ color: 'var(--color-accent)' }}>story</em>.
                <br className="hidden sm:block" />
                They respond to what&rsquo;s <em className="not-italic" style={{ color: 'var(--color-accent)' }}>true</em> right now.
              </h1>

              <p
                className="mt-7 text-white/85 leading-relaxed max-w-3xl text-lg lg:text-xl"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(14px)',
                  transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s',
                }}
              >
                Seven Arrows Recovery runs equine-assisted psychotherapy on a
                private 160-acre ranch at the base of the Swisshelm Mountains in
                Cochise County, Arizona. Our herd works alongside licensed trauma
                therapists in sessions that access material talk-therapy alone
                rarely reaches — attachment wounds, nervous-system regulation,
                shame, and the implicit imprint of addiction.
              </p>

              <div
                className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(14px)',
                  transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s',
                }}
              >
                <a
                  href="#meet-herd"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Meet the herd
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
                <a
                  href="tel:+18669964308"
                  className="inline-flex items-center gap-2 text-white/85 font-semibold border-b border-white/40 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-white hover:border-white transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Call (866) 996-4308
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Animated SVG "horse at the rail" seal. Strokes draw in on mount
 * using stroke-dashoffset — pure CSS animation, no library. The seal
 * ring pulses subtly once the silhouette is in place.
 */
function AnimatedHorseSeal({ mounted }: { mounted: boolean }) {
  return (
    <div
      className="hidden lg:block shrink-0"
      aria-hidden="true"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.85)',
        transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.1s',
      }}
    >
      <svg viewBox="0 0 160 160" width="130" height="130" className="text-white">
        <defs>
          <style>{`
            @keyframes dash { to { stroke-dashoffset: 0; } }
            @keyframes breathe { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
            .ring-outer { stroke-dasharray: 500; stroke-dashoffset: 500; animation: dash 2.2s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; }
            .ring-inner { stroke-dasharray: 440; stroke-dashoffset: 440; animation: dash 2.4s cubic-bezier(0.16,1,0.3,1) 0.4s forwards; }
            .horse-line { stroke-dasharray: 760; stroke-dashoffset: 760; animation: dash 2.6s cubic-bezier(0.16,1,0.3,1) 0.7s forwards; }
            .tick { stroke-dasharray: 20; stroke-dashoffset: 20; animation: dash 0.6s ease 1.8s forwards; }
            .sparkle { animation: breathe 3s ease-in-out infinite; transform-origin: center; }
          `}</style>
        </defs>
        <circle cx="80" cy="80" r="78" className="ring-outer" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="80" cy="80" r="70" className="ring-inner" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />

        {/* Horse silhouette — walking at the rail, approximated with a
            single continuous stroke for the draw-in animation. */}
        <path
          d="M40 100 L44 96 L50 98 L56 92 L62 94 L70 86 L78 82 L88 80 L96 84 L104 82 L110 78 L114 74 L118 72 L122 70 L124 66 L126 62 L122 62 L118 64 L116 60 L118 56 L122 56 L124 58 L126 62 L128 66 L128 72 L126 78 L122 82 L118 86 L114 92 L112 98 L110 104 L108 110 L108 116 L112 120 L112 124 L108 124 L104 120 L102 114 L100 108 L96 104 L90 102 L82 104 L74 108 L68 112 L62 116 L56 118 L52 120 L54 124 L50 124 L46 120 L42 116 L40 110 L38 104 Z"
          className="horse-line"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.95"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Compass-tick marks around the outer ring */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
          const x1 = 80 + Math.cos(angle) * 74;
          const y1 = 80 + Math.sin(angle) * 74;
          const x2 = 80 + Math.cos(angle) * 78;
          const y2 = 80 + Math.sin(angle) * 78;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="tick"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1"
              strokeLinecap="round"
              style={{ animationDelay: `${1.6 + i * 0.03}s` }}
            />
          );
        })}

        {/* Accent dot */}
        <circle cx="128" cy="54" r="2" className="sparkle" fill="var(--color-accent, #d88966)" />
      </svg>
    </div>
  );
}
