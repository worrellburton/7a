'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 10. Closing CTA with admissions-timeline
 * chip and the three standard CTAs. Matches the other 10-phase
 * pages' close aesthetic.
 */
export default function DualCTA() {
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
    <section ref={ref} className="relative overflow-hidden bg-dark-section text-white" aria-labelledby="dual-cta-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 60%)' }} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ backgroundColor: 'rgba(216,137,102,0.14)', color: 'var(--color-accent)', fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Admissions · 24–48 hours
        </span>
        <h2 id="dual-cta-heading" className="font-bold tracking-tight mb-7" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)', lineHeight: 1.03, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.18s' }}>
          Treat <em className="not-italic" style={{ color: 'var(--color-accent)' }}>both</em>. Together. Here.
        </h2>
        <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.35s' }}>
          If you or someone you love is struggling with both a mental-health
          condition and substance use, integrated treatment is not a luxury —
          it is the work that actually lasts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.55s' }}>
          <a href="tel:+18669964308" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-8 py-4 text-sm font-semibold shadow-[0_20px_50px_-18px_rgba(0,0,0,0.7)] transition-all" style={{ fontFamily: 'var(--font-body)' }}>
            Call (866) 996-4308
          </a>
          <Link href="/admissions#verify" className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Verify Insurance
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 text-white/90 hover:text-white font-semibold tracking-[0.1em] uppercase text-[12px] border-b border-white/40 hover:border-white pb-1 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Contact Admissions</Link>
        </div>
        <p className="mt-12 text-[11px] uppercase tracking-[0.22em] text-white/50" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 1s ease 0.9s' }}>
          JCAHO Accredited &nbsp;·&nbsp; LegitScript Certified &nbsp;·&nbsp; HIPAA Compliant
        </p>
      </div>
    </section>
  );
}
