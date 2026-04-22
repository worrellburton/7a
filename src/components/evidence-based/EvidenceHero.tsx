'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Evidence-Based — Phase 1 hero.
 *
 * Shared video-backdrop pattern (Swisshelm clip) so this page
 * matches the rest of the inner-page chrome, but with a clinical,
 * editorial title block: eyebrow marking the framework lineage
 * (Rhoton · Gentry), serif headline, prose lede, and a pair of
 * anchored CTAs into the phase framework + admissions.
 */
export default function EvidenceHero() {
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
      aria-labelledby="evidence-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      <video
        ref={videoRef}
        src={siteVideos.swisshelm}
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
            'linear-gradient(180deg, rgba(12,6,4,0.55) 0%, rgba(12,6,4,0.35) 30%, rgba(12,6,4,0.6) 70%, rgba(12,6,4,0.92) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 12% 60%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 70%)',
        }}
      />

      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[80vh] lg:min-h-[86vh] pb-24 lg:pb-32 flex flex-col justify-end">
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
                <Link href="/" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Home</Link>
              </li>
              <li className="text-white/40">/</li>
              <li>
                <Link href="/our-program" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Our Program</Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80">Clinical Approach</li>
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
            Rooted in the work of Dr. Rhoton &amp; Dr. Gentry
          </p>

          <h1
            id="evidence-hero-heading"
            className="font-bold tracking-tight leading-[0.98] max-w-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 6.6vw, 5.6rem)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            Our clinical approach is <em className="not-italic" style={{ color: 'var(--color-accent)' }}>relational</em> first.
          </h1>

          <p
            className="mt-7 text-white/85 leading-relaxed max-w-2xl text-lg lg:text-xl"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s',
            }}
          >
            Grounded in empowerment and resilience-based frameworks, we believe
            healing occurs not through force or pathology, but through the
            restoration of safety, connection, and self-leadership.
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
              href="#phases"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              See the phase framework
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <Link
              href="/admissions#verify"
              className="inline-flex items-center gap-2 text-white/85 font-semibold border-b border-white/40 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-white hover:border-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Verify Insurance
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
