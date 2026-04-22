'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 10. Final CTA with aurora backdrop.
 */
export default function CocaineCTA() {
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
      aria-labelledby="cocaine-cta-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 20% 30%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(107,42,20,0.3) 0%, rgba(107,42,20,0) 70%)',
          animation: visible ? 'c-aurora 18s ease-in-out infinite alternate' : 'none',
        }}
      />
      <style>{`
        @keyframes c-aurora {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-2%, 1%, 0) scale(1.04); }
          100% { transform: translate3d(2%, -1%, 0) scale(1); }
        }
      `}</style>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="text-[11px] tracking-[0.28em] uppercase font-semibold text-accent mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.1s',
          }}
        >
          Ready to step off the cycle
        </p>
        <h2
          id="cocaine-cta-heading"
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
          The reward system rebuilds.{' '}
          <em className="not-italic text-accent">Yours can too.</em>
        </h2>
        <p
          className="text-white/75 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.35s',
          }}
        >
          Our admissions team can verify your insurance and begin
          intake within 24 to 48 hours. One confidential call gets the
          cardiologist, the trauma clinician, and the horses on your
          calendar.
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
            href="/admissions"
            className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 border border-white/30 hover:border-white/60 text-white rounded-full px-8 py-4 text-base font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify my insurance
          </Link>
        </div>

        <p
          className="mt-10 text-[11px] tracking-[0.2em] uppercase font-semibold text-white/45"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.7s',
          }}
        >
          JCAHO accredited · LegitScript certified · HIPAA compliant · answered 24/7
        </p>
      </div>
    </section>
  );
}
