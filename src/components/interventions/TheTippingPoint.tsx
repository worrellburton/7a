'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 2. "The Tipping Point."
 *
 * Left column: eyebrow + serif headline + editorial paragraph that
 * reframes calling for an interventionist as an act of love rather
 * than failure.
 *
 * Right column: an animated line chart showing how family stress
 * rises on its own vs. how a structured intervention breaks the line
 * and redirects it downward. Line paints on scroll-in; the break
 * point glows with a warm accent pulse.
 */
export default function TheTippingPoint() {
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
      { threshold: 0.3, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-20 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="tipping-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 18% 45%, rgba(216,137,102,0.08) 0%, rgba(216,137,102,0) 65%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">The Tipping Point</p>
            <h2
              id="tipping-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.6vw, 2.9rem)',
                lineHeight: 1.06,
              }}
            >
              By the time you&rsquo;re looking at this page,{' '}
              <em className="not-italic text-primary">you already know.</em>
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The average family waits two to seven years between the
              moment they first say the word &ldquo;addiction&rdquo; out
              loud and the moment they pick up the phone. In that gap,
              the disease keeps working. Boundaries erode. Trust bleeds
              out. Resources drain. And the person you love becomes
              harder and harder to reach.
            </p>
            <p
              className="text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              A professional intervention isn&rsquo;t a last resort. It
              is a structured, compassionate interruption of a pattern
              that will not interrupt itself. The moment you&rsquo;re
              in now is not failure — it is the point where the shape
              of the story changes.
            </p>
          </div>

          <div className="lg:col-span-6">
            <TippingChart visible={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Animated family-stress curve — rises on its own, then breaks down
 *  after a labeled intervention point. */
function TippingChart({ visible }: { visible: boolean }) {
  // Two paths: stress without help keeps climbing; with help falls
  // away after the intervention point. SVG uses stroke-dash animation
  // so the lines "draw in" on scroll.
  return (
    <div className="relative aspect-[4/3] w-full">
      <svg
        viewBox="0 0 600 420"
        className="w-full h-full"
        aria-label="Family distress chart — without intervention the line keeps rising, with professional intervention the line breaks downward toward recovery."
      >
        <defs>
          <linearGradient id="tp-without" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b45a39" />
            <stop offset="100%" stopColor="#6b2a14" />
          </linearGradient>
          <linearGradient id="tp-with" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d88966" />
            <stop offset="100%" stopColor="#2f6f5e" />
          </linearGradient>
          <filter id="tp-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <g stroke="rgba(20,10,6,0.08)" strokeWidth="1">
          {[80, 160, 240, 320].map((y) => (
            <line key={y} x1="40" x2="560" y1={y} y2={y} />
          ))}
          {[140, 260, 380, 500].map((x) => (
            <line key={x} x1={x} x2={x} y1="40" y2="360" />
          ))}
        </g>

        {/* Axes labels */}
        <text
          x="40"
          y="30"
          fontFamily="var(--font-body)"
          fontSize="11"
          fill="#14100a88"
          letterSpacing="2"
          textAnchor="start"
        >
          FAMILY DISTRESS
        </text>
        <text
          x="560"
          y="395"
          fontFamily="var(--font-body)"
          fontSize="11"
          fill="#14100a88"
          letterSpacing="2"
          textAnchor="end"
        >
          TIME →
        </text>

        {/* "Without guidance" rising curve */}
        <path
          d="M 40 330 C 160 310, 220 280, 280 240 S 420 130, 560 60"
          fill="none"
          stroke="url(#tp-without)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 900,
            strokeDashoffset: visible ? 0 : 900,
            transition: 'stroke-dashoffset 2.2s cubic-bezier(0.22,1,0.36,1) 0.2s',
          }}
        />

        {/* Intervention point marker */}
        <g
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease 1.4s',
          }}
        >
          <circle cx="310" cy="220" r="14" fill="#d88966" filter="url(#tp-glow)" />
          <circle cx="310" cy="220" r="6" fill="#fff" />
          <text
            x="310"
            y="200"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="14"
            fontStyle="italic"
            fill="#14100a"
          >
            intervention
          </text>
        </g>

        {/* "With guidance" recovering curve — forks at the intervention point */}
        <path
          d="M 310 220 C 370 232, 420 260, 460 300 S 520 352, 560 360"
          fill="none"
          stroke="url(#tp-with)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 400,
            strokeDashoffset: visible ? 0 : 400,
            transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 1.6s',
          }}
        />

        {/* End-point labels */}
        <text
          x="560"
          y="75"
          textAnchor="end"
          fontFamily="var(--font-body)"
          fontSize="12"
          fontWeight="600"
          fill="#6b2a14"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 2.2s',
          }}
        >
          without help
        </text>
        <text
          x="560"
          y="378"
          textAnchor="end"
          fontFamily="var(--font-body)"
          fontSize="12"
          fontWeight="600"
          fill="#2f6f5e"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 2.8s',
          }}
        >
          with help
        </text>
      </svg>
    </div>
  );
}
