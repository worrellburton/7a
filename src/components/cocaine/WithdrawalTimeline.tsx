'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 5. "The first thirty days."
 *
 * A four-phase withdrawal + stabilization timeline rendered as an
 * animated curve. The curve rises out of a trough (crash) through
 * anhedonia and protracted symptoms, climbing toward a new stable
 * baseline. Four callout cards pin the stages. Paints in on scroll.
 */

type Phase = {
  label: string;
  days: string;
  body: string;
  // x-position (0..1) along the curve where the callout anchors.
  anchor: number;
};

const phases: Phase[] = [
  {
    label: 'Crash',
    days: 'Days 1–3',
    body: 'Exhaustion, hypersomnia, intense hunger, dysphoria. The body is paying back the sleep and nourishment deferred during use. Medical supervision matters most here.',
    anchor: 0.08,
  },
  {
    label: 'Acute withdrawal',
    days: 'Days 4–10',
    body: 'Strong cravings, irritability, anhedonia, difficulty concentrating, vivid dreams. Mood is flat; pleasure circuits are still offline. This is where dropout risk peaks without structure.',
    anchor: 0.32,
  },
  {
    label: 'Extinction / PAWS',
    days: 'Weeks 2–6',
    body: 'Post-acute withdrawal syndrome: intermittent low mood, cue-triggered cravings, disrupted sleep. Trauma work often becomes accessible as the acute noise quiets.',
    anchor: 0.62,
  },
  {
    label: 'Re-regulation',
    days: 'Weeks 6–12+',
    body: 'A new baseline begins to stabilize. Natural rewards start registering again — food, rest, connection, music. Aftercare and holistic practice keep the curve climbing.',
    anchor: 0.9,
  },
];

export default function WithdrawalTimeline() {
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
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="withdrawal-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">The First Thirty Days</p>
          <h2
            id="withdrawal-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Cocaine withdrawal is{' '}
            <em className="not-italic text-primary">quieter than you think</em> — and
            longer than you&rsquo;d want to do alone.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Unlike alcohol or benzodiazepines, cocaine withdrawal
            isn&rsquo;t medically dramatic. It&rsquo;s emotionally
            brutal. The real risk is psychological — anhedonia,
            cravings, and the pull of the cycle — which is why
            structure and supportive community during the first
            month carries the most weight.
          </p>
        </div>

        {/* Animated curve */}
        <div className="relative rounded-3xl bg-white border border-black/5 p-6 lg:p-10 shadow-sm">
          <CurveChart visible={visible} phases={phases} />
        </div>

        {/* Four phase cards below */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mt-8">
          {phases.map((p, i) => (
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

function CurveChart({ visible, phases }: { visible: boolean; phases: Phase[] }) {
  // Curve rises from a deep trough at the left to a stable high on
  // the right. Viewbox: 900x300. Curve path is hand-shaped.
  const viewW = 900;
  const viewH = 300;
  const curvePath = 'M 30 260 C 80 290, 110 270, 150 220 S 260 80, 360 90 S 500 160, 560 150 S 720 100, 870 60';

  // Approximate y for anchor callouts by sampling a few points; the
  // values below are hand-tuned so dots land on the curve visually.
  const anchorPoints: Array<[number, number]> = [
    [80, 280], // crash
    [280, 140], // acute
    [540, 150], // PAWS
    [810, 70], // re-regulation
  ];

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="wt-curve" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b2a14" />
          <stop offset="50%" stopColor="#d88966" />
          <stop offset="100%" stopColor="#2f6f5e" />
        </linearGradient>
      </defs>

      {/* Horizontal "goal baseline" */}
      <line x1="30" x2={viewW - 30} y1="70" y2="70" stroke="rgba(20,10,6,0.15)" strokeWidth="1" strokeDasharray="5 5" />
      <text x={viewW - 30} y="62" textAnchor="end" fontFamily="var(--font-body)" fontSize="10" letterSpacing="2" fill="#14100a80">
        HEALTHY BASELINE
      </text>

      {/* Curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="url(#wt-curve)"
        strokeWidth="4"
        strokeLinecap="round"
        style={{
          strokeDasharray: 1200,
          strokeDashoffset: visible ? 0 : 1200,
          transition: 'stroke-dashoffset 3s cubic-bezier(0.22,1,0.36,1) 0.2s',
        }}
      />

      {/* Phase anchors + labels on the curve */}
      {anchorPoints.map(([x, y], i) => {
        const p = phases[i];
        return (
          <g
            key={p.label}
            style={{
              opacity: visible ? 1 : 0,
              transition: `opacity 0.6s ease ${1.2 + i * 0.3}s`,
            }}
          >
            <circle cx={x} cy={y} r="7" fill="var(--color-primary)" stroke="#fff" strokeWidth="2.5" />
            <text
              x={x}
              y={y - 18}
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontSize="14"
              fontStyle="italic"
              fill="#14100a"
            >
              {p.label}
            </text>
            <text
              x={x}
              y={y + 22}
              textAnchor="middle"
              fontFamily="var(--font-body)"
              fontSize="10"
              letterSpacing="2"
              fill="#14100a88"
            >
              {p.days.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
