'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstanceRewiring as RewiringContent } from '@/lib/substances/types';

/**
 * Substance — Phase 8. Rebuilding the baseline — climbing curve with
 * 4 anchor labels (sleep / movement / connection / meaning by
 * default, but substance-specific).
 */
export default function SubstanceRewiring({ content }: { content: RewiringContent }) {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Layout anchors along the curve using the content's x position (0..1).
  const curveAnchors: Array<[number, number]> = [
    [120, 230],
    [300, 180],
    [460, 130],
    [620, 80],
  ];

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div
            className="lg:col-span-5"
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
                fontSize: 'clamp(2rem, 4.2vw, 2.9rem)',
                lineHeight: 1.05,
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

          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-warm-bg border border-black/5 p-6 lg:p-10">
              <svg viewBox="0 0 720 300" className="w-full h-auto" aria-hidden="true">
                <defs>
                  <linearGradient id="sr-curve" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6b2a14" />
                    <stop offset="100%" stopColor="#2f6f5e" />
                  </linearGradient>
                </defs>
                <line x1="40" x2="700" y1="60" y2="60" stroke="rgba(20,10,6,0.18)" strokeWidth="1" strokeDasharray="5 5" />
                <text x="700" y="52" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
                  HEALTHY BASELINE
                </text>
                <path
                  d="M 40 260 C 120 255, 180 230, 250 190 S 380 140, 460 120 S 600 80, 700 60"
                  fill="none"
                  stroke="url(#sr-curve)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 900,
                    strokeDashoffset: visible ? 0 : 900,
                    transition: 'stroke-dashoffset 3s cubic-bezier(0.22,1,0.36,1) 0.2s',
                  }}
                />
                {content.anchors.slice(0, 4).map((a, i) => {
                  const [x, y] = curveAnchors[i];
                  return (
                    <g
                      key={a.label}
                      style={{
                        opacity: visible ? 1 : 0,
                        transition: `opacity 0.6s ease ${1 + i * 0.3}s`,
                      }}
                    >
                      <circle cx={x} cy={y} r="7" fill="var(--color-primary)" stroke="#fff" strokeWidth="2.5" />
                      <text x={x} y={y - 18} textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontStyle="italic" fill="#14100a">
                        {a.label}
                      </text>
                      <text x={x} y={y + 22} textAnchor="middle" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a88">
                        {a.hint.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
                <text x="40" y="290" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
                  WEEK 1
                </text>
                <text x="700" y="290" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
                  MONTH 12+
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
