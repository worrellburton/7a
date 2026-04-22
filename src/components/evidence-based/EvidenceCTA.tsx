'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 10. Closing CTA. Warm-gradient background,
 * big serif close, three CTAs, and a compact trust row with the
 * accreditation line below.
 */
export default function EvidenceCTA() {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white"
      aria-labelledby="evidence-cta-heading"
      style={{
        background:
          'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 85% 15%, rgba(216,137,102,0.3) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 15% 85%, rgba(10,5,3,0.35) 0%, rgba(10,5,3,0) 65%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Begin with a conversation
        </p>
        <h2
          id="evidence-cta-heading"
          className="font-bold tracking-tight mb-8 mx-auto max-w-4xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 5.2vw, 4.2rem)',
            lineHeight: 1.02,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.18s',
          }}
        >
          Clinical depth. <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Human presence.</em> One call away.
        </h2>
        <p
          className="text-white/85 text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-12"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.95s ease 0.4s',
          }}
        >
          Our admissions team can walk you through our clinical approach in
          plain language, verify your insurance, and help you determine the
          right path forward &mdash; typically within 24 to 48 hours.
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
            className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-8 py-4 text-sm font-semibold shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call (866) 996-4308
          </a>
          <Link
            href="/admissions#verify"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify Insurance
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] border-b border-white/40 hover:border-white pb-1 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Contact Admissions
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
