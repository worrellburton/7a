'use client';

import { useEffect, useRef, useState } from 'react';

// Quiet "many of us are in recovery" credibility section. Centerpiece is
// a Seven Arrows medallion drawn with SVG strokes — circle + 4-direction
// cross + 7 arrows radiating outward, animated via stroke-dashoffset on
// scroll-in so it appears to ink itself onto the page over ~2 seconds.

export default function InRecoverySection() {
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
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [active]);

  // Seven arrows radiating from the center, evenly spaced across 360°.
  const arrows = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2);

  return (
    <section
      ref={ref}
      className="bg-warm-bg py-20 lg:py-28 border-y border-black/5 overflow-hidden"
      aria-labelledby="in-recovery-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left: animated medallion */}
        <div className="lg:col-span-5 flex justify-center">
          <svg
            viewBox="-100 -100 200 200"
            className="w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] text-primary"
            aria-hidden="true"
          >
            {/* Outer ring */}
            <circle
              cx="0"
              cy="0"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray={2 * Math.PI * 60}
              strokeDashoffset={active ? 0 : 2 * Math.PI * 60}
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 0.05s' }}
            />
            {/* Inner cross — N/S */}
            <line
              x1="0"
              y1="-60"
              x2="0"
              y2="60"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeDasharray="120"
              strokeDashoffset={active ? 0 : 120}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.4s' }}
            />
            {/* Inner cross — E/W */}
            <line
              x1="-60"
              y1="0"
              x2="60"
              y2="0"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeDasharray="120"
              strokeDashoffset={active ? 0 : 120}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.55s' }}
            />
            {/* Center dot */}
            <circle
              cx="0"
              cy="0"
              r="3"
              fill="currentColor"
              opacity={active ? 1 : 0}
              style={{ transition: 'opacity 0.6s ease 0.9s' }}
            />

            {/* Seven outward arrows — beaded fringe / direction indicators.
                Each arrow is a line + a small dot at the outer end. */}
            {arrows.map((angle, i) => {
              const innerR = 64;
              const outerR = 88;
              const x1 = Math.cos(angle) * innerR;
              const y1 = Math.sin(angle) * innerR;
              const x2 = Math.cos(angle) * outerR;
              const y2 = Math.sin(angle) * outerR;
              const dotR = 2.2;
              const len = outerR - innerR;
              const delay = 0.9 + i * 0.08;
              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={active ? 0 : len}
                    style={{ transition: `stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}
                  />
                  <circle
                    cx={x2}
                    cy={y2}
                    r={dotR}
                    fill="currentColor"
                    opacity={active ? 1 : 0}
                    style={{ transition: `opacity 0.4s ease ${delay + 0.6}s` }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: copy */}
        <div className="lg:col-span-7">
          <p className="section-label mb-4">Lived experience</p>
          <h2
            id="in-recovery-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Many of us are <em className="not-italic text-primary">in recovery</em> ourselves.
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-base lg:text-lg max-w-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            A meaningful share of the people you&rsquo;ll meet at Seven
            Arrows have walked this road first &mdash; clinicians, peer
            support, admissions, and operations alike. We don&rsquo;t treat
            recovery as a credential we carry on a wall. We treat it as
            shared ground.
          </p>
        </div>
      </div>
    </section>
  );
}
