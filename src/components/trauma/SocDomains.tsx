'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 4 — Forward-Facing Freedom's three Sense of Coherence domains:
 * Comprehensibility, Manageability, Meaningfulness. Each gets a
 * hand-drawn SVG diagram that animates in on scroll:
 *
 *   1. Comprehensibility — concentric rings pulsing outward (seeing
 *      the pattern in the nervous-system response).
 *   2. Manageability     — polyvagal-style waveform that modulates as
 *      it scans across (self-regulation).
 *   3. Meaningfulness    — a compass rose with a directional arrow
 *      finding its way (purpose, direction, values-driven action).
 *
 * Section lives on the dark plum backdrop — same visual weight as the
 * legacy section it replaces, but far more alive.
 */
export default function SocDomains() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
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

  const domains = [
    {
      number: '01',
      title: 'Comprehensibility',
      lede: 'See the pattern.',
      body:
        'Build a coherent understanding of your nervous system. Learn to recognize the threat response and how to interrupt it. Urges and cravings become predictable responses to dysregulation — not failures of willpower.',
      Diagram: RippleDiagram,
    },
    {
      number: '02',
      title: 'Manageability',
      lede: 'Regulate from within.',
      body:
        'Cultivate self-regulation through neuroception, interoception, and acute relaxation strategies. Interrupt adaptive threat responses to return to physiological safety — so emotional regulation and behavioral effectiveness become reachable states, not distant ideals.',
      Diagram: WaveformDiagram,
    },
    {
      number: '03',
      title: 'Meaningfulness',
      lede: 'Move toward what matters.',
      body:
        "Develop a personal code of honor, a mission statement, and a vision for your recovery. Engage life's challenges as purposeful and worth sustained investment — intentional, values-driven living.",
      Diagram: CompassDiagram,
    },
  ];

  return (
    <section
      ref={ref}
      id="forward-facing"
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="soc-heading"
    >
      {/* Faint warm glow anchored at top-center */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[60%] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 70% at 50% 0%, rgba(216,137,102,0.12) 0%, rgba(216,137,102,0) 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 lg:mb-24">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            The Forward-Facing Freedom<span className="align-super text-[9px]">®</span> Approach
          </p>
          <h2
            id="soc-heading"
            className="font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 4.3vw, 3.5rem)',
              lineHeight: 1.05,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            Stabilize. Understand. <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Grow</em>.
          </h2>
          <p
            className="text-white/75 leading-relaxed text-lg"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.9s ease 0.35s',
            }}
          >
            Developed by J. Eric Gentry, PhD, Forward-Facing Freedom
            is a present-focused, salutogenic model. Rather than
            beginning with retrospective trauma processing, it builds
            capacity first — creating the neurological foundation
            needed for deep, lasting change.
          </p>
          <p
            className="text-white/45 text-[11px] mt-4 italic"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.9s ease 0.55s',
            }}
          >
            The three domains — Comprehensibility, Manageability, and
            Meaningfulness — are drawn from Aaron Antonovsky&rsquo;s
            Sense of Coherence (1979, 1987), the foundational work on
            salutogenesis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-14">
          {domains.map(({ number, title, lede, body, Diagram }, i) => (
            <div
              key={title}
              className="relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.45 + i * 0.15}s`,
              }}
            >
              <div
                className="relative mx-auto w-full max-w-[280px] aspect-square mb-7 rounded-2xl overflow-hidden"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Diagram active={visible} delay={0.45 + i * 0.15} />
              </div>

              <p
                className="text-[11px] font-semibold tracking-[0.28em] text-accent mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {number}
              </p>
              <h3
                className="text-white font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.55rem',
                }}
              >
                {title}
              </h3>
              <p
                className="text-accent italic mb-4"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.02rem' }}
              >
                {lede}
              </p>
              <p
                className="text-white/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Diagrams ─────────────────────────────────────────────────────── */

function RippleDiagram({ active, delay = 0 }: { active: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      <defs>
        <radialGradient id="rippleFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Concentric pulsing rings — staggered on the same cycle so the
          image reads as a ripple expanding outward. */}
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx="120"
          cy="120"
          r={20 + i * 22}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.55 - i * 0.1}
          strokeWidth="1"
          style={{
            transformOrigin: '120px 120px',
            animation: active
              ? `ripplePulse 3.8s ease-in-out ${delay + i * 0.2}s infinite`
              : 'none',
          }}
        />
      ))}
      <circle cx="120" cy="120" r="10" fill="url(#rippleFill)" />
      <circle cx="120" cy="120" r="3" fill="var(--color-accent)" />
      <style>{`
        @keyframes ripplePulse {
          0%, 100% { transform: scale(0.92); opacity: 0.55; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

function WaveformDiagram({ active }: { active: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      <defs>
        <linearGradient id="wfStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g opacity={active ? 1 : 0} style={{ transition: 'opacity 0.6s ease 0.2s' }}>
        {/* Ambient scalelines */}
        {[80, 120, 160].map((y, i) => (
          <line
            key={y}
            x1="20"
            x2="220"
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2 5"
            strokeWidth={i === 1 ? 1 : 0.75}
          />
        ))}

        {/* Calmed waveform */}
        <path fill="none" stroke="url(#wfStroke)" strokeWidth="1.5" strokeLinecap="round">
          <animate
            attributeName="d"
            dur="5s"
            repeatCount="indefinite"
            values="
              M 20 150 Q 60 80 100 130 T 180 120 T 220 120;
              M 20 120 Q 60 160 100 110 T 180 130 T 220 120;
              M 20 135 Q 60 90 100 125 T 180 115 T 220 120;
              M 20 150 Q 60 80 100 130 T 180 120 T 220 120
            "
          />
        </path>
        <path fill="none" stroke="var(--color-primary)" strokeOpacity="0.45" strokeWidth="1">
          <animate
            attributeName="d"
            dur="7s"
            repeatCount="indefinite"
            values="
              M 20 160 Q 60 110 100 140 T 180 135 T 220 140;
              M 20 140 Q 60 170 100 125 T 180 145 T 220 140;
              M 20 155 Q 60 115 100 135 T 180 130 T 220 140;
              M 20 160 Q 60 110 100 140 T 180 135 T 220 140
            "
          />
        </path>

        {/* Interoception indicator */}
        <circle cx="120" cy="120" r="3.5" fill="var(--color-accent)">
          <animate attributeName="cy" dur="4s" repeatCount="indefinite" values="122; 118; 124; 120; 122" />
          <animate attributeName="opacity" dur="4s" repeatCount="indefinite" values="0.8; 1; 0.8" />
        </circle>
      </g>
    </svg>
  );
}

function CompassDiagram({ active, delay = 0 }: { active: boolean; delay?: number }) {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {/* Outer ring + tick marks */}
      <circle cx="120" cy="120" r="80" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="120" cy="120" r="64" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r1 = 80;
        const r2 = i % 6 === 0 ? 72 : 76;
        return (
          <line
            key={i}
            x1={120 + Math.cos(a) * r1}
            y1={120 + Math.sin(a) * r1}
            x2={120 + Math.cos(a) * r2}
            y2={120 + Math.sin(a) * r2}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={i % 6 === 0 ? 1.3 : 0.7}
          />
        );
      })}
      <text
        x="120"
        y="48"
        textAnchor="middle"
        fill="var(--color-accent)"
        fontFamily="var(--font-body)"
        fontSize="10"
        fontWeight="700"
        letterSpacing="3"
      >
        N
      </text>

      {/* Needle — rotates on mount with easing */}
      <g
        style={{
          transformOrigin: '120px 120px',
          transform: active ? 'rotate(18deg)' : 'rotate(-150deg)',
          transition: `transform 1.6s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.1}s`,
        }}
      >
        <polygon
          points="120,55 128,120 120,130 112,120"
          fill="var(--color-accent)"
          opacity="0.95"
        />
        <polygon
          points="120,185 128,120 120,110 112,120"
          fill="var(--color-primary)"
          opacity="0.7"
        />
        <circle cx="120" cy="120" r="5" fill="white" stroke="var(--color-accent)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
