'use client';

import { useEffect, useRef, useState } from 'react';
import type { SubstanceCycle as CycleContent } from '@/lib/substances/types';

/**
 * Substance — Phase 3. Circular n-stage cycle with orbiting dot.
 * Works for any substance; stages default to 4 but any count divides
 * the ring evenly.
 */
export default function SubstanceCycle({ content }: { content: CycleContent }) {
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

  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const r = 140;
  const circumference = 2 * Math.PI * r;

  const nodes = content.stages.map((s, i) => {
    const angle = (i / content.stages.length) * 2 * Math.PI - Math.PI / 2;
    return { ...s, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
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
                fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
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

          <div className="lg:col-span-7 flex justify-center">
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
              <defs>
                <linearGradient id="sc-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d88966" />
                  <stop offset="50%" stopColor="#b45a39" />
                  <stop offset="100%" stopColor="#6b2a14" />
                </linearGradient>
              </defs>

              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(20,10,6,0.08)" strokeWidth="16" />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="url(#sc-ring)"
                strokeWidth="10"
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: visible ? 0 : circumference,
                  transition: 'stroke-dashoffset 2.8s cubic-bezier(0.22,1,0.36,1) 0.2s',
                }}
              />

              <g style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 3s' }}>
                <circle r="8" fill="#fff" stroke="#d88966" strokeWidth="3">
                  <animateMotion
                    dur="9s"
                    repeatCount="indefinite"
                    path={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`}
                  />
                </circle>
              </g>

              <text x={cx} y={cy - 10} textAnchor="middle" fontFamily="var(--font-display)" fontSize="18" fontStyle="italic" fill="#14100a">
                the loop
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="var(--font-body)" fontSize="11" letterSpacing="3" fill="#14100a80">
                REPEATS
              </text>

              {nodes.map((n, i) => (
                <g
                  key={n.label}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'scale(1)' : 'scale(0.4)',
                    transformOrigin: `${n.x}px ${n.y}px`,
                    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${1.2 + i * 0.2}s`,
                  }}
                >
                  <circle cx={n.x} cy={n.y} r="14" fill="var(--color-primary)" />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontFamily="var(--font-body)" fontSize="10" fontWeight="700" fill="#fff" letterSpacing="1">
                    {String(i + 1).padStart(2, '0')}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + (n.y < cy ? -28 : 38)}
                    textAnchor="middle"
                    fontFamily="var(--font-display)"
                    fontSize="17"
                    fontWeight="700"
                    fill="#14100a"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + (n.y < cy ? -12 : 54)}
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize="10.5"
                    letterSpacing="2"
                    fill="#14100a88"
                  >
                    {n.hint.toUpperCase()}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
