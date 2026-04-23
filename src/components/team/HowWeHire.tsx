'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// "How we hire" — three-step horizontal pathway. Animated rail draws
// left-to-right with stroke-dashoffset on scroll-in, then each step's
// node and label fades in with a stagger. Subtle on purpose so it
// reads as supporting copy, not a hard sell.

const steps = [
  {
    title: 'Lived experience first',
    body: 'Many of our hires come through alumni, partner clinicians, or recovery community referrals — not job-board churn.',
  },
  {
    title: 'Clinically rigorous',
    body: 'Licensure, supervision, and continuing-ed expectations are non-negotiable for every clinical and medical role.',
  },
  {
    title: 'Cultural fit, mutually',
    body: 'Final-stage candidates spend a day on the ranch with the team. We hire people we want to share a campus with for years.',
  },
];

export default function HowWeHire() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current || active) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [active]);

  return (
    <section
      ref={ref}
      className="bg-warm-bg py-20 lg:py-28 border-y border-black/5"
      aria-labelledby="how-we-hire-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 lg:mb-16">
          <p className="section-label justify-center mb-4">How we hire</p>
          <h2
            id="how-we-hire-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            We hire <em className="not-italic text-primary">slowly</em>, on purpose.
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-base lg:text-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            A small team only stays high-quality if every seat is filled
            with intention. Here&rsquo;s how a Seven Arrows hire actually
            happens.
          </p>
        </div>

        {/* Pathway — desktop horizontal, mobile vertical */}
        <div className="relative">
          {/* Desktop horizontal rail */}
          <svg
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
            className="hidden lg:block absolute left-0 right-0 top-7 w-full h-[60px] text-primary/40 pointer-events-none"
            aria-hidden="true"
          >
            <line
              x1="80"
              y1="30"
              x2="920"
              y2="30"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="840"
              strokeDashoffset={active ? 0 : 840}
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 0.1s' }}
            />
          </svg>

          <ol className="grid lg:grid-cols-3 gap-10 lg:gap-6">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="relative text-center lg:px-6"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.18}s`,
                }}
              >
                {/* Node circle */}
                <div className="relative mx-auto mb-5 w-14 h-14 rounded-full bg-white border border-primary/30 flex items-center justify-center shadow-sm">
                  <span
                    className="text-primary font-bold text-lg tabular-nums"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3
                  className="text-foreground font-bold text-lg lg:text-xl mb-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-foreground/65 text-sm leading-relaxed max-w-[320px] mx-auto"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/who-we-are/careers"
            className="inline-flex items-center gap-2 text-foreground border border-foreground/20 hover:border-foreground/60 rounded-full px-6 py-3 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            See open positions
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
