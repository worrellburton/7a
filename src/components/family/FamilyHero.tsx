'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Family Program — Phase 1 hero. Speaks directly to the family
 * member on the page (spouse, parent, adult child) rather than to
 * the prospective client. Video backdrop matches inner-page chrome.
 */
export default function FamilyHero() {
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
      aria-labelledby="family-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      <video
        ref={videoRef}
        src={siteVideos.horsesRail}
        poster="/images/embrace-connection.jpg"
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
              <li className="text-white/80">Family Program</li>
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
            Family program
          </p>

          <h1
            id="family-hero-heading"
            className="font-bold tracking-tight leading-[0.98] max-w-5xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 6.6vw, 5.6rem)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            The whole <em className="not-italic" style={{ color: 'var(--color-accent)' }}>system</em> heals, or nothing does.
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
            Addiction is a family disease. Our family program gives parents,
            partners, and adult children the therapy, education, and
            coordination they need &mdash; while the client is in treatment
            and long after discharge.
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
              className="group inline-flex items-center gap-3 rounded-full bg-primary hover:bg-primary-dark text-white pl-2.5 pr-5 py-2 transition-colors shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)]"
              style={{ fontFamily: 'var(--font-body)' }}
              aria-label="Call us 24/7 at (866) 996-4308"
            >
              <span
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                <svg className="w-4 h-4 transition-transform group-hover:-rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-primary">
                  <span className="absolute inset-0 rounded-full bg-[#4ade80] animate-ping opacity-70" />
                </span>
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/80">
                  Families call 24/7
                </span>
                <span className="text-sm font-bold tracking-wide">(866) 996-4308</span>
              </span>
            </a>
            <a
              href="#components"
              className="inline-flex items-center gap-2 text-white/85 font-semibold border-b border-white/40 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-white hover:border-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              See what we offer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
