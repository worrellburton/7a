'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 3. "The cycle."
 *
 * A circular four-stage loop (use → peak → crash → crave) rendered as
 * an animated SVG orbit. On scroll-in: the ring traces itself, four
 * labeled nodes pop into place, and a small accent dot begins
 * traveling the ring as a visual metaphor for being stuck in it.
 */

const stages = [
  { label: 'Use', hint: 'Hit or binge' },
  { label: 'Peak', hint: '15–30 minutes' },
  { label: 'Crash', hint: 'Hours to days' },
  { label: 'Crave', hint: 'The next hit beckons' },
];

export default function TheCycle() {
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

  // Circle geometry
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const r = 140;
  const circumference = 2 * Math.PI * r;

  // Four node positions at 12, 3, 6, 9 o'clock.
  const nodes = stages.map((s, i) => {
    const angle = (i / 4) * 2 * Math.PI - Math.PI / 2;
    return { ...s, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="cycle-heading"
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
            <p className="section-label mb-5">The Cycle</p>
            <h2
              id="cycle-heading"
              className="text-foreground font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
                lineHeight: 1.06,
              }}
            >
              Four stages. <em className="not-italic text-primary">No exit without structure.</em>
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cocaine&rsquo;s short half-life is what makes it so
              compulsive. A hit, a peak, a crash — and the craving
              starts again, often within the same hour. Willpower
              isn&rsquo;t the problem; the loop is running faster than
              conscious decision-making can interrupt.
            </p>
            <p
              className="text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Breaking the cycle requires something other than more
              effort. It requires a room where the loop cannot close —
              which is what residential care is for.
            </p>
          </div>

          <div className="lg:col-span-7 flex justify-center">
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
              <defs>
                <linearGradient id="tc-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d88966" />
                  <stop offset="50%" stopColor="#b45a39" />
                  <stop offset="100%" stopColor="#6b2a14" />
                </linearGradient>
              </defs>

              {/* Background ring */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(20,10,6,0.08)" strokeWidth="16" />

              {/* Animated traced ring */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="url(#tc-ring)"
                strokeWidth="10"
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: visible ? 0 : circumference,
                  transition: 'stroke-dashoffset 2.8s cubic-bezier(0.22,1,0.36,1) 0.2s',
                }}
              />

              {/* Traveling dot — rides the ring after it's drawn. Using
                  an SVG animateMotion path so it actually orbits rather
                  than flipping through positions. */}
              <g
                style={{
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.6s ease 3s',
                }}
              >
                <circle r="8" fill="#fff" stroke="#d88966" strokeWidth="3">
                  <animateMotion
                    dur="9s"
                    repeatCount="indefinite"
                    path={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`}
                  />
                </circle>
              </g>

              {/* Center label */}
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontSize="18"
                fontStyle="italic"
                fill="#14100a"
              >
                the loop
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontFamily="var(--font-body)"
                fontSize="11"
                letterSpacing="3"
                fill="#14100a80"
              >
                REPEATS
              </text>

              {/* Four stage nodes */}
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
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize="10"
                    fontWeight="700"
                    fill="#fff"
                    letterSpacing="1"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </text>

                  {/* Label + hint — positioned away from center */}
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
