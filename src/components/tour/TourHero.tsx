'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Tour — Phase 1 hero. Full-bleed looping ranchLife video behind a
 * big serif headline. Breadcrumb + lede + CTAs sit over a warm dual-
 * gradient scrim. Scroll cue nudges the visitor down into the rest
 * of the page.
 */
export default function TourHero() {
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
      aria-labelledby="tour-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      <video
        ref={videoRef}
        src={siteVideos.ranchLife}
        poster="/images/facility-exterior-mountains.jpg"
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
            'linear-gradient(180deg, rgba(12,6,4,0.45) 0%, rgba(12,6,4,0.25) 30%, rgba(12,6,4,0.55) 70%, rgba(12,6,4,0.92) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 15% 50%, rgba(107,42,20,0.25) 0%, rgba(107,42,20,0) 70%)',
        }}
      />

      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[86vh] lg:min-h-[92vh] pb-28 lg:pb-36 flex flex-col justify-end">
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
                <Link href="/" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>
                  Home
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80">Campus Tour</li>
            </ol>
          </nav>

          <p
            className="flex items-center gap-4 text-[11px] tracking-[0.24em] uppercase font-semibold text-white/85 mb-6"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
            Campus Tour
          </p>

          <h1
            id="tour-hero-heading"
            className="font-bold tracking-tight leading-[0.98] text-white max-w-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            Step onto <br className="hidden sm:block" />
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>
              the ranch
            </em>
            .
          </h1>

          <p
            className="mt-8 text-white/85 leading-relaxed max-w-2xl text-lg lg:text-xl"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s',
            }}
          >
            A visual walk through Seven Arrows — our residences, therapy spaces,
            the herd, and the Arizona sky that made us choose this land.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s',
            }}
          >
            <Link
              href="/contact#schedule"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Schedule a Private Tour
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <a
              href="#gallery"
              className="inline-flex items-center gap-2 text-white/85 font-semibold border-b border-white/40 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-white hover:border-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Explore the Gallery
            </a>
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 pointer-events-none"
        aria-hidden="true"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 1.2s ease 1.2s' }}
      >
        <span
          className="block w-px h-10 bg-white/40"
          style={{ animation: 'tourScrollCue 2.2s ease-in-out infinite' }}
        />
        <style>{`
          @keyframes tourScrollCue {
            0%,100% { opacity: 0.25; transform: translateY(-4px); }
            50% { opacity: 0.85; transform: translateY(4px); }
          }
        `}</style>
      </div>
    </section>
  );
}
