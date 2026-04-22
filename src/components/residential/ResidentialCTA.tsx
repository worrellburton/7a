'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/** Phase 10 — closing CTA with admission-timeline chip. */

export default function ResidentialCTA() {
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
      className="relative py-28 lg:py-36 bg-dark-section text-white overflow-hidden"
      aria-labelledby="res-cta-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 60%)',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{
            backgroundColor: 'rgba(216,137,102,0.14)',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Typical admission · 24 – 48 hours
        </span>
        <h2
          id="res-cta-heading"
          className="font-bold tracking-tight mb-7"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)',
            lineHeight: 1.03,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          Take the first step <em className="not-italic" style={{ color: 'var(--color-accent)' }}>today</em>.
        </h2>
        <p
          className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.35s',
          }}
        >
          Our admissions team can verify your insurance, walk you through intake,
          and often have you on-site within one to two days. Same ranch, same
          team, same quiet confidence that healing is possible.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.55s',
          }}
        >
          <a href="tel:+18669964308" className="btn-primary">
            Call (866) 996-4308
          </a>
          <Link
            href="/admissions#verify"
            className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
          >
            Verify Insurance
          </Link>
          <Link
            href="/contact"
            className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
          >
            Contact Admissions
          </Link>
        </div>
        <p
          className="mt-12 text-[11px] uppercase tracking-[0.22em] text-white/50"
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
