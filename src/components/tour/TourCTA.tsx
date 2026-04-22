'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Tour — Phase 10. Closing CTA. Full-bleed looping sonoranRanch
 * video behind a dark scrim + warm radial glow; serif close, three
 * CTAs (call / schedule visit / contact), optional form anchor, and
 * a compact bottom row with admissions timeline + compliance line.
 */

export default function TourCTA() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white"
      aria-labelledby="tour-cta-heading"
    >
      <video
        ref={videoRef}
        src={siteVideos.sonoranRanch}
        poster="/images/group-sunset-desert.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Scrims — dark base + warm radial + top fade-in from previous
          section so the seam doesn't feel like a snap. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,4,10,0.35) 0%, rgba(6,4,10,0.6) 45%, rgba(6,4,10,0.92) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 95%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-40 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-[11px] font-semibold tracking-[0.2em] uppercase"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          Admissions open · 24–48 hour intake
        </span>

        <h2
          id="tour-cta-heading"
          className="font-bold tracking-tight mb-8 mx-auto max-w-4xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
            lineHeight: 0.98,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}
        >
          See it <em className="not-italic" style={{ color: 'var(--color-accent)' }}>for yourself</em>.
        </h2>

        <p
          className="text-white/85 text-lg lg:text-xl leading-relaxed mx-auto max-w-2xl mb-12"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.95s ease 0.4s',
          }}
        >
          Nothing on a screen compares to walking the property. Schedule a
          private tour, or start admissions today &mdash; our team will verify
          your insurance and walk you through intake within a day or two.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.6s',
          }}
        >
          <a
            href="tel:+18669964308"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-8 py-4 text-sm font-semibold shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call (866) 996-4308
          </a>
          <Link
            href="/contact#schedule"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Schedule a Private Tour
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link
            href="/admissions#verify"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] border-b border-white/40 hover:border-white pb-1 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify Insurance
          </Link>
        </div>

        <div
          className="mt-16 pt-10 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:gap-10 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-white/55"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
          }}
        >
          <span>JCAHO Accredited</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>LegitScript Certified</span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>HIPAA Compliant</span>
        </div>
      </div>
    </section>
  );
}
