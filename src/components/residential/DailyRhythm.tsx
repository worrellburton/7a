'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 4 — daily rhythm timeline.
 *
 * A visual "day in the life" with a horizontal sun-arc SVG that paints
 * in on scroll, four stops (Morning / Mid-Morning / Afternoon /
 * Evening) anchored beneath it, each showing a clock-like icon and a
 * short description of that block.
 */

const blocks = [
  {
    time: 'Morning',
    clock: '6:30 – 9:00',
    activities: 'Sunrise mindfulness, breakfast, clinical check-in',
  },
  {
    time: 'Mid-Morning',
    clock: '9:00 – 12:00',
    activities: 'Individual therapy, evidence-based group sessions',
  },
  {
    time: 'Afternoon',
    clock: '12:00 – 5:30',
    activities: 'Holistic & experiential work, fitness and wellness',
  },
  {
    time: 'Evening',
    clock: '5:30 – 10:00',
    activities: 'Community dinner, 12-step or support group, reflection',
  },
];

export default function DailyRhythm() {
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
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="rhythm-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">A Day in the Life</p>
          <h2
            id="rhythm-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.8vw, 2.9rem)', lineHeight: 1.05 }}
          >
            Structure is foundational to <em className="not-italic text-primary">early recovery</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Each day at Seven Arrows balances clinical work, wellness activity,
            personal reflection, and community connection. Here&rsquo;s the shape
            of it — paced to the nervous system, never the clock.
          </p>
        </div>

        {/* Sun arc + time block cards */}
        <div className="relative">
          <svg
            className="absolute inset-x-0 -top-2 lg:-top-4 w-full h-20 lg:h-24 pointer-events-none hidden md:block"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="rhythmArc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
                <stop offset="30%" stopColor="var(--color-accent)" stopOpacity="0.8" />
                <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M 20 100 Q 600 -30 1180 100"
              fill="none"
              stroke="url(#rhythmArc)"
              strokeWidth="1.25"
              strokeDasharray="1600"
              strokeDashoffset={visible ? 0 : 1600}
              style={{ transition: 'stroke-dashoffset 2.2s cubic-bezier(0.22,1,0.36,1) 0.3s' }}
            />
            {[0.08, 0.35, 0.65, 0.92].map((t, i) => {
              // Points along the quadratic path; approximate with parabola.
              const x = 20 + t * 1160;
              const y = 100 - 130 * (4 * t * (1 - t));
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--color-accent)"
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: `opacity 0.4s ease ${1.5 + i * 0.18}s`,
                  }}
                />
              );
            })}
          </svg>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 relative z-10 pt-10 lg:pt-14">
            {blocks.map((b, i) => (
              <article
                key={b.time}
                className="rounded-2xl bg-white p-7 border border-black/5 hover:border-primary/20 transition-colors"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(22px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.12}s`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-primary"
                    style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="12 7 12 12 15 14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary" style={{ fontFamily: 'var(--font-body)' }}>
                    {b.clock}
                  </p>
                </div>
                <h3 className="text-foreground font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  {b.time}
                </h3>
                <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {b.activities}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
