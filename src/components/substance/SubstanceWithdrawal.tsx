'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstanceWithdrawal as WithdrawalContent } from '@/lib/substances/types';

/**
 * Substance — Phase 5. Four-phase withdrawal + stabilization timeline.
 */
export default function SubstanceWithdrawal({ content }: { content: WithdrawalContent }) {
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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">{content.eyebrow}</p>
          <h2
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            {content.title}
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {content.body}
          </p>
        </div>

        <div className="relative rounded-3xl bg-white border border-black/5 p-6 lg:p-10 shadow-sm">
          <CurveChart visible={visible} phaseCount={content.phases.length} labels={content.phases.map((p) => p.label)} days={content.phases.map((p) => p.days)} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mt-8">
          {content.phases.map((p, i) => (
            <article
              key={p.label}
              className="rounded-2xl bg-white border border-black/5 p-5 lg:p-6"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.1}s`,
              }}
            >
              <p
                className="text-[11px] tracking-[0.22em] uppercase font-bold text-primary mb-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.days}
              </p>
              <h3
                className="text-foreground font-bold mb-2"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}
              >
                {p.label}
              </h3>
              <p
                className="text-foreground/65 text-[13.5px] leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurveChart({
  visible,
  labels,
  days,
}: {
  visible: boolean;
  phaseCount: number;
  labels: string[];
  days: string[];
}) {
  const viewW = 900;
  const viewH = 300;
  const curvePath =
    'M 30 260 C 80 290, 110 270, 150 220 S 260 80, 360 90 S 500 160, 560 150 S 720 100, 870 60';
  const anchors: Array<[number, number]> = [
    [80, 280],
    [280, 140],
    [540, 150],
    [810, 70],
  ];
  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="sw-curve" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b2a14" />
          <stop offset="50%" stopColor="#d88966" />
          <stop offset="100%" stopColor="#2f6f5e" />
        </linearGradient>
      </defs>
      <line x1="30" x2={viewW - 30} y1="70" y2="70" stroke="rgba(20,10,6,0.15)" strokeWidth="1" strokeDasharray="5 5" />
      <text x={viewW - 30} y="62" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
        HEALTHY BASELINE
      </text>
      <path
        d={curvePath}
        fill="none"
        stroke="url(#sw-curve)"
        strokeWidth="4"
        strokeLinecap="round"
        style={{
          strokeDasharray: 1200,
          strokeDashoffset: visible ? 0 : 1200,
          transition: 'stroke-dashoffset 3s cubic-bezier(0.22,1,0.36,1) 0.2s',
        }}
      />
      {anchors.map(([x, y], i) => (
        <g
          key={i}
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity 0.6s ease ${1.2 + i * 0.3}s`,
          }}
        >
          <circle cx={x} cy={y} r="7" fill="var(--color-primary)" stroke="#fff" strokeWidth="2.5" />
          <text x={x} y={y - 18} textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontStyle="italic" fill="#14100a">
            {labels[i] || ''}
          </text>
          <text x={x} y={y + 22} textAnchor="middle" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a88">
            {(days[i] || '').toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
