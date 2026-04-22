'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Who We Help — Phase 1 hero.
 *
 * Video backdrop + keyword-rich H1 and lede. The H1 carries the
 * page's primary promise in plain language; the lede paragraph
 * covers the core SEO/GEO keywords (residential addiction treatment,
 * Arizona, adults 18+, alcohol / opioids / stimulants / dual-diagnosis,
 * Phoenix / Tucson / Scottsdale / Mesa) in natural reading order so
 * LLMs can quote a single sentence for direct-answer queries.
 */
export default function WhoHero() {
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
      aria-labelledby="who-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      <video
        ref={videoRef}
        src={siteVideos.swisshelm}
        poster="/images/group-gathering-pavilion.jpg"
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
            'linear-gradient(180deg, rgba(12,6,4,0.58) 0%, rgba(12,6,4,0.38) 30%, rgba(12,6,4,0.62) 70%, rgba(12,6,4,0.92) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 12% 60%, rgba(107,42,20,0.3) 0%, rgba(107,42,20,0) 70%)',
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
              <li className="text-white/80">Who We Help</li>
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
            Who we help
          </p>

          <h1
            id="who-hero-heading"
            className="font-bold tracking-tight leading-[0.98] max-w-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 6.6vw, 5.6rem)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            Whoever walks{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>through the door</em>.
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
            Seven Arrows Recovery is a residential drug and alcohol rehab in
            Arizona for adults 18 and older &mdash; treating alcohol use
            disorder, opioid and heroin addiction, stimulant use, benzodiazepine
            dependence, and co-occurring mental health conditions. We serve
            clients from Phoenix, Tucson, Scottsdale, Mesa, and across the
            country from our 160-acre ranch at the base of the Swisshelm
            Mountains.
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
              href="tel:+18669964308"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Call (866) 996-4308
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
