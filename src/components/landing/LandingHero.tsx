'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';
import { usePersona } from './PersonaContext';

/**
 * Phase 1 — Hero + instant-trust stack.
 *
 * Cinematic video backdrop, single clear headline, live trust strip
 * (4.9★ · reviews · accreditation · 1:1 primary clinician · answered now), and a
 * three-CTA ladder — call (highest intent), verify insurance
 * (medium), text/message (lowest). Headline + first-paragraph copy
 * adapts to the chosen persona; the trust strip and CTAs do not.
 *
 * Mobile: full-bleed video, stacked CTAs, and the live trust strip
 * becomes a scroll-sticky under-hero band on phones so the phone
 * number is always a thumb-reach away.
 */

const personaCopy = {
  self: {
    eyebrow: 'You already picked up the hardest thing',
    headline: (
      <>
        A place to come <em className="not-italic text-accent">back to yourself.</em>
      </>
    ),
    body: "Residential addiction treatment in Arizona, built around 1:1 primary-clinician care, a low client-to-staff ratio, trauma-informed clinical work, and a 160-acre ranch that gives your nervous system the room it has been asking for. Admissions answered 24/7.",
  },
  loved_one: {
    eyebrow: 'You called us because no one else would be this honest',
    headline: (
      <>
        A place your loved one can <em className="not-italic text-accent">actually come back from.</em>
      </>
    ),
    body: "Residential addiction treatment for the person you love, designed to hold the whole family — weekly family support sessions, quarterly weekends on the ranch, and a clinical team that keeps you in the loop with intention. Admissions answered 24/7.",
  },
  none: {
    eyebrow: 'Boutique residential addiction treatment in Arizona',
    headline: (
      <>
        A place to <em className="not-italic text-accent">heal.</em>
      </>
    ),
    body: "Small-census residential care at the base of the Swisshelm Mountains. Trauma-informed clinical program, 1:1 primary-clinician attention, holistic practice, and an admissions line answered 24/7 by someone who will take the time to actually listen.",
  },
};

export default function LandingHero() {
  const { persona, ready } = usePersona();
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  const copy = persona ? personaCopy[persona] : personaCopy.none;

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="landing-hero-heading"
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
            'linear-gradient(180deg, rgba(12,6,4,0.55) 0%, rgba(12,6,4,0.35) 30%, rgba(12,6,4,0.6) 70%, rgba(12,6,4,0.9) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 45% 55% at 12% 60%, rgba(216,137,102,0.25) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 2.75rem)' }}
      >
        <div className="min-h-[92vh] lg:min-h-[88vh] pb-14 lg:pb-20 flex flex-col justify-between">
          {/* Top bit: eyebrow + trust strip */}
          <div />

          {/* Middle: headline */}
          <div className="max-w-4xl">
            <p
              className="flex items-center gap-4 text-[11px] tracking-[0.24em] uppercase font-semibold text-white/85 mb-6"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: mounted && ready ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            >
              <span className="block w-10 h-px bg-accent/80" aria-hidden="true" />
              {copy.eyebrow}
            </p>

            <h1
              id="landing-hero-heading"
              className="font-bold tracking-tight leading-[0.98] max-w-4xl"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 7vw, 6rem)',
                opacity: mounted && ready ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(22px)',
                transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
              }}
            >
              {copy.headline}
            </h1>

            <p
              className="mt-7 text-white/85 leading-relaxed max-w-2xl text-lg lg:text-xl"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: mounted && ready ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.5s',
              }}
            >
              {copy.body}
            </p>

            {/* Tri-CTA ladder */}
            <div
              className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.7s',
              }}
            >
              <a
                href="tel:+18669964308"
                className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-foreground rounded-full px-7 py-3.5 text-base font-bold transition-colors shadow-xl"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="relative w-2.5 h-2.5 rounded-full bg-foreground/90">
                  <span className="absolute inset-0 rounded-full bg-foreground/40 animate-ping" />
                </span>
                Call (866) 996-4308
              </a>
              <Link
                href="#landing-insurance"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/50 text-white rounded-full px-7 py-3.5 text-base font-semibold transition-colors backdrop-blur-md"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Verify my insurance
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <a
                href="sms:+18669964308"
                className="inline-flex items-center gap-2 text-white/75 hover:text-accent text-sm font-semibold transition-colors underline decoration-white/20 hover:decoration-accent/60 underline-offset-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Or text us
              </a>
            </div>
          </div>

          {/* Bottom: live trust strip */}
          <div
            className="mt-10 lg:mt-14 max-w-4xl"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.9s',
            }}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] tracking-[0.14em] uppercase text-white/80 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
              <TrustChip>
                <StarIcon /> 4.9 · 28 Google reviews
              </TrustChip>
              <TrustChip>JCAHO accredited</TrustChip>
              <TrustChip>1:1 primary clinician</TrustChip>
              <TrustChip>
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
                  </span>
                  Answered now
                </span>
              </TrustChip>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-white/15 rounded-full px-3 py-1.5 bg-white/5 backdrop-blur-sm">
      {children}
    </span>
  );
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
