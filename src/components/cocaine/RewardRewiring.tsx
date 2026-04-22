'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 8. "Rebuilding the reward."
 *
 * Visual bookend to Phase 2: instead of the stimulant curve wrecking
 * the baseline, this section shows a natural-reward curve slowly
 * climbing back toward healthy pleasure response. Four labeled
 * "natural rewards" sit on the curve as anchor points. Paints in on
 * scroll.
 */

const anchors = [
  { x: 120, y: 230, label: 'Sleep', hint: 'Restores' },
  { x: 300, y: 180, label: 'Movement', hint: 'Endogenous dopamine' },
  { x: 460, y: 130, label: 'Connection', hint: 'Oxytocin, safety' },
  { x: 620, y: 80, label: 'Meaning', hint: 'Purpose, identity' },
];

export default function RewardRewiring() {
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

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="rewire-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5" style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}>
            <p className="section-label mb-5">Rebuilding Reward</p>
            <h2
              id="rewire-heading"
              className="text-foreground font-bold tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 2.9rem)',
                lineHeight: 1.05,
              }}
            >
              The baseline <em className="not-italic text-primary">comes back</em>.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most clients describe the moment around week four when
              music starts to move them again. Or when a meal tastes
              like a meal. Or when they notice the arc of a horse&rsquo;s
              neck in the morning light and feel something that
              isn&rsquo;t flat.
            </p>
            <p
              className="text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Those are the natural-reward circuits reporting back
              online. Sleep, movement, connection, and meaning are the
              four pillars that carry the baseline upward — not
              because they replace the drug, but because they rebuild
              what the drug stole.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-warm-bg border border-black/5 p-6 lg:p-10">
              <RewireChart visible={visible} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RewireChart({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 720 300" className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="rw-curve" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b2a14" />
          <stop offset="100%" stopColor="#2f6f5e" />
        </linearGradient>
      </defs>

      {/* Healthy baseline */}
      <line x1="40" x2="700" y1="60" y2="60" stroke="rgba(20,10,6,0.18)" strokeWidth="1" strokeDasharray="5 5" />
      <text x="700" y="52" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
        HEALTHY BASELINE
      </text>

      {/* Climbing curve */}
      <path
        d="M 40 260 C 120 255, 180 230, 250 190 S 380 140, 460 120 S 600 80, 700 60"
        fill="none"
        stroke="url(#rw-curve)"
        strokeWidth="4"
        strokeLinecap="round"
        style={{
          strokeDasharray: 900,
          strokeDashoffset: visible ? 0 : 900,
          transition: 'stroke-dashoffset 3s cubic-bezier(0.22,1,0.36,1) 0.2s',
        }}
      />

      {/* Anchor points on the curve */}
      {anchors.map((a, i) => (
        <g
          key={a.label}
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity 0.6s ease ${1 + i * 0.3}s`,
          }}
        >
          <circle cx={a.x} cy={a.y} r="7" fill="var(--color-primary)" stroke="#fff" strokeWidth="2.5" />
          <text x={a.x} y={a.y - 18} textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontStyle="italic" fill="#14100a">
            {a.label}
          </text>
          <text x={a.x} y={a.y + 22} textAnchor="middle" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a88">
            {a.hint.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Time axis hint */}
      <text x="40" y="290" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
        WEEK 1
      </text>
      <text x="700" y="290" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
        MONTH 12+
      </text>
    </svg>
  );
}
