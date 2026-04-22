'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Phase 10 — Closing conversion stack.
 *
 * The last band before the footer. Pulls the strongest trust
 * signals together one more time and hands the visitor a clean
 * three-way CTA: call, verify, text. Behavior that matters:
 *
 *   • Live "answered-within-60-seconds" indicator. Pulses green
 *     during the real-world 24/7 admissions window (which is always
 *     for us) — the color + motion works as a soft urgency cue
 *     without dishonest "3 beds left!" theater.
 *
 *   • The phone CTA is keyboard-focus-first: most visitors tabbing
 *     in from screen readers land here, and should be handed the
 *     phone number without hunting.
 *
 *   • Aurora backdrop mirrors the rest of the site's close, so the
 *     landing page doesn't end with a different visual vocabulary
 *     than every inner page.
 */
export default function LandingClose() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-dark-section text-white py-28 lg:py-40"
      aria-labelledby="landing-close-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 20% 30%, rgba(216,137,102,0.3) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(107,42,20,0.32) 0%, rgba(107,42,20,0) 70%)',
          animation: visible ? 'lc-aurora 18s ease-in-out infinite alternate' : 'none',
        }}
      />
      <style>{`@keyframes lc-aurora{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-2%,1%,0) scale(1.04)}100%{transform:translate3d(2%,-1%,0) scale(1)}}`}</style>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Live indicator */}
        <div
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <span className="relative w-2 h-2 rounded-full bg-emerald-400">
            <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
          </span>
          <span className="text-[11px] tracking-[0.22em] uppercase font-semibold text-white/85" style={{ fontFamily: 'var(--font-body)' }}>
            Admissions line live · typically answered under 60 seconds
          </span>
        </div>

        <h2
          id="landing-close-heading"
          className="font-bold tracking-tight mb-6"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            lineHeight: 1.02,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}
        >
          One call doesn&rsquo;t commit you to anything.{' '}
          <em className="not-italic text-accent">Except the next step.</em>
        </h2>
        <p
          className="text-white/75 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.35s',
          }}
        >
          Our admissions team answers 24/7, verifies insurance in about
          fifteen minutes, and has held beds within 24 hours when the
          situation needed it. This page ends here. The rest is a
          conversation.
        </p>
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.5s',
          }}
        >
          <a
            href="tel:+18669964308"
            className="group inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-foreground rounded-full px-8 py-4 text-base font-bold transition-colors shadow-2xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="relative w-2.5 h-2.5 rounded-full bg-foreground/90">
              <span className="absolute inset-0 rounded-full bg-foreground/40 animate-ping" />
            </span>
            Call (866) 996-4308
          </a>
          <Link
            href="#landing-insurance"
            className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 border border-white/30 hover:border-white/60 text-white rounded-full px-8 py-4 text-base font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify my insurance
          </Link>
          <a
            href="sms:+18669964308"
            className="inline-flex items-center gap-2 text-white/70 hover:text-accent font-semibold transition-colors underline decoration-white/20 hover:decoration-accent/60 underline-offset-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Or text us
          </a>
        </div>

        <p
          className="mt-10 text-[11px] tracking-[0.2em] uppercase font-semibold text-white/45"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.7s',
          }}
        >
          JCAHO accredited · LegitScript certified · HIPAA compliant · 42 CFR Part 2 protected
        </p>
      </div>
    </section>
  );
}
