'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Alumni & Aftercare — Phase 10 closing CTA. Warm-gradient sign-off
 * with alumni-line 24/7 pill + 'Talk to admissions' link.
 */
export default function AlumniCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white"
      style={{
        background:
          'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
      }}
      aria-labelledby="alumni-cta-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.85s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          Alumni line · 24/7
        </p>
        <h2
          id="alumni-cta-heading"
          className="font-bold tracking-tight mb-6 mx-auto max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4.6vw, 3.4rem)',
            lineHeight: 1.04,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.2s',
          }}
        >
          Call us before it gets <em className="not-italic" style={{ color: 'var(--color-accent)' }}>too hard</em>.
        </h2>
        <p
          className="text-white/85 text-lg leading-relaxed max-w-xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.4s',
          }}
        >
          Alumni, families, and referrers can reach us any hour. For anyone
          not yet a client, admissions will help you find the right level of
          care &mdash; at Seven Arrows or with a trusted partner.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.55s',
          }}
        >
          <a
            href="tel:+18669964308"
            className="group inline-flex items-center gap-3 rounded-full bg-white text-primary-dark hover:bg-warm-bg pl-2.5 pr-5 py-2 transition-colors shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: 'var(--font-body)' }}
            aria-label="Call us 24/7 at (866) 996-4308"
          >
            <span
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
              style={{ backgroundColor: 'rgba(107,42,20,0.1)' }}
            >
              <svg className="w-4 h-4 transition-transform group-hover:-rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-white">
                <span className="absolute inset-0 rounded-full bg-[#4ade80] animate-ping opacity-70" />
              </span>
            </span>
            <span className="flex flex-col items-start leading-tight text-left">
              <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-primary-dark/70">
                Available 24/7
              </span>
              <span className="text-sm font-bold tracking-wide">(866) 996-4308</span>
            </span>
          </a>
          <Link
            href="/admissions"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Talk to admissions
          </Link>
        </div>
      </div>
    </section>
  );
}
