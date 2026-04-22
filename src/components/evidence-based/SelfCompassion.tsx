'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 6. Editorial "held note" on self-compassion
 * and the reduction of shame as the core commitment across every
 * phase of treatment. Mirror of the Why Us "Our Promise" beat — dark
 * section, reverent typography, quiet scale.
 *
 * The visual is an animated contrast between two typographic "pill"
 * states — Shame (tight, dark, constricted letterspacing) on the
 * left, Self-Compassion (loose, accented, expansive) on the right —
 * with an animated arrow showing the transition on scroll-in.
 */
export default function SelfCompassion() {
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
      className="relative overflow-hidden bg-dark-section text-white"
      aria-labelledby="self-compassion-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 40%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 60%), radial-gradient(ellipse 55% 55% at 80% 80%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 60%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-40">
        <p
          className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-7"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Our Core Commitment
        </p>
        <h2
          id="self-compassion-heading"
          className="font-bold tracking-tight mb-9"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.1rem, 4.4vw, 3.4rem)',
            lineHeight: 1.03,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.18s',
          }}
        >
          <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Shame</em> is one of the greatest
          barriers to healing. Self-compassion is how we take it down.
        </h2>

        {/* Shame → Self-Compassion typographic transition */}
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 my-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1.2s cubic-bezier(0.16,1,0.3,1) 0.4s',
          }}
        >
          <div
            className="flex-1 rounded-2xl px-6 py-6 text-center border border-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(10,5,3,0.8) 0%, rgba(28,14,10,0.6) 100%)',
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.4em] text-white/45 mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Before
            </p>
            <p
              className="text-white/80 leading-none select-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                letterSpacing: '-0.04em',
              }}
            >
              shame
            </p>
            <p className="text-white/45 text-xs mt-3" style={{ fontFamily: 'var(--font-body)' }}>
              Tight. Constricted. Self-as-problem.
            </p>
          </div>

          {/* Arrow / transition indicator */}
          <div className="flex items-center justify-center">
            <svg
              className="w-10 h-10 rotate-90 sm:rotate-0"
              viewBox="0 0 48 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="12"
                x2="44"
                y2="12"
                strokeDasharray="50"
                strokeDashoffset={visible ? 0 : 50}
                style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) 0.8s' }}
              />
              <polyline
                points="36,4 44,12 36,20"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.5s ease 2.1s',
                }}
              />
            </svg>
          </div>

          <div
            className="flex-1 rounded-2xl px-6 py-6 text-center border"
            style={{
              background:
                'linear-gradient(135deg, rgba(216,137,102,0.15) 0%, rgba(188,107,74,0.25) 100%)',
              borderColor: 'rgba(216,137,102,0.35)',
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.4em] text-accent mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              After
            </p>
            <p
              className="text-accent leading-none select-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.4rem, 2.8vw, 2rem)',
                letterSpacing: '0.02em',
                fontStyle: 'italic',
              }}
            >
              self&#x2011;compassion
            </p>
            <p className="text-white/65 text-xs mt-3" style={{ fontFamily: 'var(--font-body)' }}>
              Spacious. Loosened. Self-as-beloved.
            </p>
          </div>
        </div>

        <p
          className="text-white/80 leading-relaxed text-lg max-w-3xl"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 1s',
          }}
        >
          Across every phase of treatment, our highest priority is cultivating
          self-compassion and reducing shame. By helping clients develop a
          compassionate relationship with themselves early in treatment, we
          create the conditions necessary for deeper therapeutic work.
        </p>
      </div>
    </section>
  );
}
