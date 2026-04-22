'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 7. "The evidence behind holistic care."
 *
 * Three big counting stats that animate up from zero when the section
 * enters the viewport. Each stat is paired with a citation-style
 * source line so the reader can tell the difference between a wellness
 * claim and a peer-reviewed finding.
 *
 * Picks deliberately: one somatic (MBSR/inflammation), one polyvagal
 * (HRV + breath), one mindfulness-for-relapse. All three map onto
 * practices on offer elsewhere on this page.
 */

interface Stat {
  target: number;
  suffix: string;
  prefix?: string;
  decimals?: number;
  title: string;
  source: string;
}

const stats: Stat[] = [
  {
    target: 43,
    suffix: '%',
    title: 'reduction in relapse risk',
    source:
      'Mindfulness-Based Relapse Prevention vs. standard aftercare, 12-month follow-up. Bowen et al., JAMA Psychiatry (2014).',
  },
  {
    target: 30,
    suffix: '%',
    title: 'drop in PTSD symptom severity',
    source:
      'Trauma-informed yoga for women with chronic, treatment-resistant PTSD. van der Kolk et al., J. Clinical Psychiatry (2014).',
  },
  {
    target: 2.5,
    suffix: '×',
    decimals: 1,
    title: 'greater heart-rate variability',
    source:
      'Slow-paced breathing (~6 breaths/min) vs. spontaneous respiration. Lehrer et al., Applied Psychophysiology (2020).',
  },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, start: boolean, decimals = 0, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(target * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return value.toFixed(decimals);
}

function StatCell({ stat, index, visible }: { stat: Stat; index: number; visible: boolean }) {
  const display = useCountUp(stat.target, visible, stat.decimals ?? 0);
  return (
    <div
      className="relative lg:border-r lg:border-white/15 lg:last:border-r-0 lg:pr-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + index * 0.12}s`,
      }}
    >
      <div
        className="font-bold tracking-tight leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 7vw, 5.2rem)',
          color: 'var(--color-accent)',
        }}
      >
        {stat.prefix || ''}
        {display}
        {stat.suffix}
      </div>
      <p
        className="mt-4 text-white font-semibold"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          lineHeight: 1.2,
        }}
      >
        {stat.title}
      </p>
      <p
        className="mt-3 text-white/60 text-[12.5px] leading-relaxed max-w-sm"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {stat.source}
      </p>
    </div>
  );
}

export default function EvidenceStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="evidence-stats-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 85%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 15% 15%, rgba(107,42,20,0.22) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            The evidence
          </p>
          <h2
            id="evidence-stats-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Not wellness theater &mdash;{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>published science.</em>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            The practices on offer here are supported by a generation of
            peer-reviewed research on the nervous system, on trauma, and on
            what actually reduces relapse. Three of the findings that shape
            our program:
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-6">
          {stats.map((s, i) => (
            <StatCell key={s.title} stat={s} index={i} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}
