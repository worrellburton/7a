'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 10. Closing CTA.
 *
 * Warm-gradient sign-off matching the other 10-phase page closers
 * (philosophy, dual-diagnosis, evidence-based). Two CTAs — call and
 * insurance verify — plus a short editorial line that reiterates the
 * page thesis in one sentence.
 */
export default function HolisticCTA() {
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
      aria-labelledby="holistic-cta-heading"
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
          A path that holds
        </p>
        <h2
          id="holistic-cta-heading"
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
          Healing the <em className="not-italic" style={{ color: 'var(--color-accent)' }}>whole person</em>, on the land.
        </h2>
        <p
          className="text-white/85 text-lg leading-relaxed max-w-xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.4s',
          }}
        >
          Clinical work and body-based practice, modern evidence and ancient
          ceremony, held together in one program. Our admissions team can walk
          you through fit and insurance, often within 24 to 48 hours.
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
            className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-8 py-4 text-sm font-semibold shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Call (866) 996-4308
          </a>
          <Link
            href="/admissions#verify"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verify Insurance
          </Link>
        </div>
      </div>
    </section>
  );
}
