'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstanceReward as RewardContent } from '@/lib/substances/types';

/**
 * Substance page — Phase 2. "The reward" section.
 *
 * Generic three-trace dopamine/reward chart used across every
 * substance page. Colors and labels come from the substance's content
 * file so heroin and cocaine visually differ but share animation
 * language.
 */
export default function SubstanceReward({ content }: { content: RewardContent }) {
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
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-20 lg:py-28 bg-warm-bg overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 78% 55%, rgba(216,137,102,0.08) 0%, rgba(216,137,102,0) 65%)',
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
            <p className="section-label mb-5">{content.eyebrow}</p>
            <h2
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.6vw, 2.9rem)',
                lineHeight: 1.06,
              }}
            >
              {content.title}
            </h2>
            {content.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-foreground/75 text-lg leading-relaxed mb-5 last:mb-0"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p}
              </p>
            ))}
          </div>

          <div className="lg:col-span-6">
            <RewardChart content={content} visible={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

function RewardChart({ content, visible }: { content: RewardContent; visible: boolean }) {
  const { natural, spike, flatline, yAxisLabel } = content.chart;
  // Unique ids so multiple instances don't collide if ever rendered
  // on the same page.
  const idBase = 'sub-reward';
  return (
    <div className="relative aspect-[4/3] w-full">
      <svg viewBox="0 0 600 420" className="w-full h-full" aria-label="Reward-response chart.">
        <defs>
          <linearGradient id={`${idBase}-spike`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={spike.color} />
            <stop offset="100%" stopColor="#6b2a14" />
          </linearGradient>
        </defs>

        <g stroke="rgba(20,10,6,0.08)" strokeWidth="1">
          {[120, 200, 280].map((y) => (
            <line key={y} x1="40" x2="560" y1={y} y2={y} />
          ))}
          {[160, 280, 400].map((x) => (
            <line key={x} x1={x} x2={x} y1="40" y2="360" />
          ))}
        </g>

        <line x1="40" x2="560" y1="280" y2="280" stroke="rgba(20,10,6,0.5)" strokeWidth="1.2" strokeDasharray="4 4" />
        <text x="44" y="275" fontFamily="var(--font-body)" fontSize="10" letterSpacing="1.5" fill="#14100a88">
          {yAxisLabel || 'BASELINE'}
        </text>

        {/* Natural reward curve */}
        <path
          d="M 40 280 C 120 280, 150 260, 180 250 S 220 280, 280 280"
          fill="none"
          stroke={natural.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 400,
            strokeDashoffset: visible ? 0 : 400,
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) 0.2s',
          }}
        />
        <text
          x="175"
          y="240"
          fontFamily="var(--font-body)"
          fontSize="11"
          fontWeight="600"
          fill={natural.color}
          textAnchor="middle"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 1.6s' }}
        >
          {natural.label}
        </text>

        {/* Substance spike + crash */}
        <path
          d="M 280 280 C 300 280, 310 75, 330 70 S 360 280, 380 320 S 430 370, 480 340"
          fill="none"
          stroke={`url(#${idBase}-spike)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          style={{
            strokeDasharray: 600,
            strokeDashoffset: visible ? 0 : 600,
            transition: 'stroke-dashoffset 2s cubic-bezier(0.22,1,0.36,1) 1s',
          }}
        />
        <text
          x="340"
          y="60"
          textAnchor="middle"
          fontFamily="var(--font-body)"
          fontSize="11"
          fontWeight="600"
          fill="#6b2a14"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 2s' }}
        >
          {spike.label}
        </text>

        {/* Flatline (chronic) */}
        <line
          x1="40"
          y1="305"
          x2="560"
          y2="305"
          stroke={flatline.color}
          strokeWidth="2"
          strokeDasharray="6 5"
          style={{
            strokeDasharray: 520,
            strokeDashoffset: visible ? 0 : 520,
            transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 3s',
          }}
        />
        <text
          x="560"
          y="298"
          textAnchor="end"
          fontFamily="var(--font-body)"
          fontSize="11"
          fontWeight="600"
          fill={flatline.color}
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 3.6s' }}
        >
          {flatline.label}
        </text>
      </svg>
    </div>
  );
}
