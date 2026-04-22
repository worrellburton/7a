'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import WebGLAurora from './WebGLAurora';

/**
 * Phase 10 — WebGL aurora CTA footer.
 *
 * Re-uses the same aurora shader that powers the page's hero, pushed
 * to higher intensity for a punchier end-of-page beat. Serif headline,
 * primary + secondary CTA, and the accreditation line we run across
 * the trust strip (JCAHO / LegitScript / HIPAA).
 */

export default function TraumaCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-28 lg:py-36 overflow-hidden text-white"
      aria-labelledby="trauma-cta-heading"
    >
      <div className="absolute inset-0 z-0 bg-dark-section" aria-hidden="true">
        <WebGLAurora className="w-full h-full" intensity={1.1} />
      </div>
      <div
        className="absolute inset-0 z-[1]"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(12,6,4,0.7) 0%, rgba(12,6,4,0.35) 55%, rgba(12,6,4,0.1) 100%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Start Here
        </p>
        <h2
          id="trauma-cta-heading"
          className="font-bold tracking-tight mb-7 mx-auto max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            lineHeight: 1.02,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          You don&rsquo;t have to carry this <em className="not-italic" style={{ color: 'var(--color-accent)' }}>alone</em>.
        </h2>
        <p
          className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.35s',
          }}
        >
          Our admissions team can verify your insurance and walk you through
          intake, often within 24 to 48 hours. Same clinicians. Same land.
          Same quiet confidence that healing is possible.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.55s',
          }}
        >
          <a
            href="tel:+18669964308"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-8 py-4 text-sm font-semibold shadow-[0_20px_50px_-18px_rgba(0,0,0,0.7)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call (866) 996-4308
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Contact Admissions Online
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        <p
          className="mt-12 text-[11px] uppercase tracking-[0.22em] text-white/55"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
          }}
        >
          JCAHO Accredited &nbsp;·&nbsp; LegitScript Certified &nbsp;·&nbsp; HIPAA Compliant
        </p>
      </div>
    </section>
  );
}
