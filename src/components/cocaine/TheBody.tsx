'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 4. "The body keeps score."
 *
 * Three count-up stats flanking a small animated heart + waveform
 * SVG. Each stat corresponds to a concrete cardiac or neurological
 * effect of chronic cocaine use. Numbers roll up on scroll-in; the
 * heart pulses to a slightly elevated rhythm that visually encodes
 * stimulant overactivation.
 */

type Stat = {
  value: number;
  suffix?: string;
  label: string;
  body: string;
};

const stats: Stat[] = [
  {
    value: 24,
    suffix: '×',
    label: 'Heart attack risk',
    body: 'Risk of acute myocardial infarction rises up to 24× in the hour after cocaine use versus baseline.',
  },
  {
    value: 7,
    suffix: '×',
    label: 'Stroke risk',
    body: 'Ischemic and hemorrhagic stroke risk climbs roughly 7× in young adults who use cocaine, independent of other risk factors.',
  },
  {
    value: 80,
    suffix: '%',
    label: 'Co-occurring anxiety',
    body: 'Roughly 80% of people who present to treatment for cocaine use disorder also meet criteria for an anxiety diagnosis.',
  },
];

function useCountUp(end: number, duration: number, started: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * end));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started]);
  return v;
}

export default function TheBody() {
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
      className="py-24 lg:py-32 bg-dark-section text-white relative overflow-hidden"
      aria-labelledby="body-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(216,137,102,0.2) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-14 items-center mb-16">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p
              className="text-[11px] tracking-[0.24em] uppercase font-semibold text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The body keeps score
            </p>
            <h2
              id="body-heading"
              className="font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
              }}
            >
              Stimulant overactivation is <em className="not-italic text-accent">physically expensive.</em>
            </h2>
            <p
              className="text-white/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cocaine narrows blood vessels, raises heart rate and
              blood pressure, thickens the blood, and holds the
              sympathetic nervous system in overdrive for hours. The
              body metabolizes the drug; the damage from the
              physiological load it created takes far longer to clear.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <HeartPulse visible={visible} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {stats.map((s, i) => (
            <StatCard key={s.label} stat={s} visible={visible} delay={0.15 + i * 0.15} />
          ))}
        </div>

        <p
          className="mt-8 text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40 max-w-3xl"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 1.2s',
          }}
        >
          Figures are directional estimates drawn from peer-reviewed literature on cocaine-associated cardiovascular and psychiatric risk. Individual risk varies.
        </p>
      </div>
    </section>
  );
}

function StatCard({ stat, visible, delay }: { stat: Stat; visible: boolean; delay: number }) {
  const count = useCountUp(stat.value, 1600, visible);
  return (
    <div
      className="rounded-2xl bg-white/5 border border-white/10 p-6 lg:p-7 backdrop-blur-sm"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <p
        className="text-[11px] tracking-[0.22em] uppercase font-semibold text-accent mb-3"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {stat.label}
      </p>
      <p
        className="font-bold text-white mb-3 tabular-nums"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.8rem, 4.5vw, 3.8rem)',
          lineHeight: 1,
        }}
      >
        {count}
        {stat.suffix && <span className="text-accent">{stat.suffix}</span>}
      </p>
      <p
        className="text-white/70 text-[14px] leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {stat.body}
      </p>
    </div>
  );
}

function HeartPulse({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 360 240" width={360} height={240} aria-hidden="true" className="max-w-full">
      <defs>
        <linearGradient id="tb-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d88966" />
          <stop offset="100%" stopColor="#b45a39" />
        </linearGradient>
        <linearGradient id="tb-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d88966" stopOpacity="0" />
          <stop offset="40%" stopColor="#d88966" stopOpacity="1" />
          <stop offset="100%" stopColor="#d88966" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Heart (slightly pulsing) */}
      <g
        style={{
          transformOrigin: '105px 120px',
          animation: visible ? 'tb-pulse 0.95s ease-in-out infinite' : 'none',
        }}
      >
        <path
          d="M 105 180 C 60 150, 30 115, 60 80 C 78 60, 98 70, 105 90 C 112 70, 132 60, 150 80 C 180 115, 150 150, 105 180 Z"
          fill="url(#tb-heart)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />
      </g>
      <style>{`
        @keyframes tb-pulse {
          0%, 60% { transform: scale(1); }
          20% { transform: scale(1.06); }
          30% { transform: scale(1.02); }
          40% { transform: scale(1.05); }
        }
      `}</style>

      {/* ECG waveform stretching from the heart to the right edge */}
      <path
        d="M 170 120 L 200 120 L 210 100 L 220 150 L 230 80 L 240 150 L 250 120 L 360 120"
        fill="none"
        stroke="url(#tb-wave)"
        strokeWidth="2.2"
        strokeLinecap="round"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: visible ? 0 : 400,
          transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 0.4s',
        }}
      />

      <text x="180" y="215" fontFamily="var(--font-body)" fontSize="10" fill="rgba(255,255,255,0.4)" letterSpacing="2">
        HR 128 · BP 158/98 · post-use
      </text>
    </svg>
  );
}
