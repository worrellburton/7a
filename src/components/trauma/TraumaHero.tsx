'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import WebGLAurora from './WebGLAurora';

/**
 * Phase 1 hero for /our-program/trauma-treatment.
 *
 * Three stacked layers from back to front:
 *  1. WebGL aurora shader — warm, slow, ambient, pauses on tab hide.
 *  2. A portrait photo (`embrace-connection.jpg`) with a heavy scrim
 *     so both the shader and the photo read through it.
 *  3. Foreground text: breadcrumb, eyebrow rule, serif headline,
 *     paragraph lede, CTA pair, and an overlay pull-quote ribbon.
 *
 * Intent: communicate the clinical-yet-human tone we use for
 * TraumAddiction® care, and give the rest of the page a visual voice
 * to match.
 */
export default function TraumaHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="trauma-hero-heading"
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      {/* Layer 1 — WebGL aurora */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <WebGLAurora className="w-full h-full" />
      </div>

      {/* Layer 2 — portrait photo. Blend mode + low opacity so the
          aurora shader stays visible through the softer parts of the
          image. */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: "url('/images/embrace-connection.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          mixBlendMode: 'overlay',
          opacity: 0.55,
        }}
      />

      {/* Layer 2b — legibility scrim. Reads cleanly on top of both the
          shader and the photo; darker at the bottom so the overlay
          quote sits against deep plum. */}
      <div
        className="absolute inset-0 z-[2]"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,6,4,0.55) 0%, rgba(12,6,4,0.35) 35%, rgba(12,6,4,0.6) 75%, rgba(12,6,4,0.9) 100%)',
        }}
      />

      {/* Layer 3 — content */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[78vh] lg:min-h-[84vh] pb-28 lg:pb-36 flex flex-col justify-end">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70"
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
              <li>
                <Link href="/our-program" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>
                  Our Program
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80">Trauma Treatment</li>
            </ol>
          </nav>

          <p
            className="flex items-center gap-4 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/85 mb-5"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
            TraumAddiction<span className="align-super text-[9px]">®</span> Treatment
          </p>

          <h1
            id="trauma-hero-heading"
            className="font-bold tracking-tight leading-[1.02] text-white max-w-4xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.75rem, 6.2vw, 5.25rem)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            Healing trauma at the root of{' '}
            <em
              className="not-italic"
              style={{ color: 'var(--color-accent)' }}
            >
              recovery
            </em>
            .
          </h1>

          <p
            className="mt-7 text-white/85 leading-relaxed max-w-2xl text-base lg:text-lg"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.45s',
            }}
          >
            Addiction rarely exists in isolation. Our TraumAddiction<span className="align-super text-[10px]">®</span>{' '}
            approach treats trauma and substance use as one integrated
            condition through the Forward-Facing Freedom<span className="align-super text-[10px]">®</span> model —
            unlocking deeper and more lasting healing.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s',
            }}
          >
            <Link
              href="/admissions#verify"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Begin Your Admission
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <a
              href="#forward-facing"
              className="inline-flex items-center gap-2 text-white/85 font-semibold border-b border-white/40 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-white hover:border-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              What Forward-Facing Freedom Looks Like
            </a>
          </div>
        </div>

        {/* Overlay pull-quote ribbon — sits over the bottom of the hero,
            reads as a typographic treatment, not a box. */}
        <figure
          className="absolute left-4 sm:left-6 lg:left-8 right-4 sm:right-6 lg:right-8 bottom-8 lg:bottom-12 max-w-3xl"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.85s',
          }}
        >
          <blockquote
            className="text-white/90 italic leading-[1.35]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.15rem, 1.8vw, 1.55rem)',
            }}
          >
            <span className="text-accent mr-2" style={{ fontSize: '1.6em', lineHeight: 0 }}>“</span>
            Addiction is rarely the problem — it’s the attempt at a
            solution. Healing begins when we understand why the nervous
            system reached for it in the first place.
          </blockquote>
          <figcaption
            className="mt-3 text-[11px] uppercase tracking-[0.22em] font-semibold text-accent"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Clinical Team · Seven Arrows Recovery
          </figcaption>
        </figure>
      </div>

      {/* Scroll cue */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1.2s ease 1.2s',
        }}
      >
        <span
          className="block w-px h-10 bg-white/40"
          style={{ animation: 'traumaScrollCue 2.2s ease-in-out infinite' }}
        />
        <style>{`
          @keyframes traumaScrollCue {
            0%, 100% { opacity: 0.25; transform: translateY(-4px); }
            50%      { opacity: 0.85; transform: translateY(4px); }
          }
        `}</style>
      </div>
    </section>
  );
}
