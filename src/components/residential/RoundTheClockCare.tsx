'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 7 — 24/7 medical & clinical reassurance.
 *
 * Dark plum backdrop with a subtle animated heartbeat SVG, serif
 * headline, and a prose paragraph. Stakes a confidence flag: real
 * clinicians, real oversight, real depth — around the clock.
 */
export default function RoundTheClockCare() {
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
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="clock-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 80% 35%, rgba(216,137,102,0.15) 0%, rgba(216,137,102,0) 65%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Around-the-Clock Care
            </p>
            <h2
              id="clock-heading"
              className="font-bold tracking-tight mb-7"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4vw, 3.2rem)', lineHeight: 1.05 }}
            >
              Someone is here <em className="not-italic" style={{ color: 'var(--color-accent)' }}>always</em>.
            </h2>
            <p className="text-white/85 text-lg leading-relaxed mb-5" style={{ fontFamily: 'var(--font-body)' }}>
              Recovery does not follow a schedule. Cravings, anxiety, and emotional
              breakthroughs arrive when they arrive &mdash; often in the small hours.
              That is why our residential team is present around the clock, with a
              licensed clinician always on call and on-site coverage every shift.
            </p>
            <p className="text-white/70 text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              Whether it is a late-night check-in or a 5 AM moment of clarity,
              someone who knows your name is here for you. That is what genuine
              residential care means.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div
              className="relative aspect-square rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.25s',
              }}
            >
              {/* Heartbeat SVG */}
              <svg viewBox="0 0 300 300" className="w-full h-full" role="img" aria-label="Continuous heartbeat glyph">
                <defs>
                  <linearGradient id="beatLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" />
                    <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Ambient rings */}
                {[90, 120, 150].map((r, i) => (
                  <circle
                    key={r}
                    cx="150"
                    cy="150"
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray="2 6"
                    style={{
                      transformOrigin: '150px 150px',
                      animation: visible ? `rtcRing${i} 6s ease-in-out infinite` : 'none',
                    }}
                  />
                ))}

                {/* ECG line */}
                <path
                  d="M 20 150 L 80 150 L 95 120 L 110 180 L 125 100 L 140 180 L 160 150 L 280 150"
                  fill="none"
                  stroke="url(#beatLine)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 400,
                    strokeDashoffset: visible ? 0 : 400,
                    transition: 'stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1) 0.35s',
                  }}
                />

                <text
                  x="150"
                  y="240"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.55)"
                  fontFamily="var(--font-body)"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="3.5"
                  style={{ textTransform: 'uppercase' }}
                >
                  24 / 7 · ON-SITE
                </text>

                <style>{`
                  @keyframes rtcRing0 { 0%,100% { transform: scale(0.95); opacity: 0.4 } 50% { transform: scale(1.04); opacity: 0.8 } }
                  @keyframes rtcRing1 { 0%,100% { transform: scale(0.98); opacity: 0.3 } 50% { transform: scale(1.02); opacity: 0.6 } }
                  @keyframes rtcRing2 { 0%,100% { transform: scale(1); opacity: 0.2 } 50% { transform: scale(1.01); opacity: 0.4 } }
                `}</style>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
