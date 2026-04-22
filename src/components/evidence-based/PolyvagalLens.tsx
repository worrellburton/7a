'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 8. Polyvagal-informed lens diagram.
 *
 * A custom SVG renders the three classic polyvagal states as stacked
 * horizontal bands — ventral vagal (safe/social) at the top, sympathetic
 * (fight/flight) in the middle, dorsal vagal (freeze/collapse) at the
 * bottom — connected by a vertical "ladder" line. An animated indicator
 * dot travels up the ladder from dorsal → sympathetic → ventral when the
 * section enters the viewport, visualizing the movement toward safety
 * that regulated presence makes possible. Each band has a body-cue list
 * on the right.
 */

const states = [
  {
    key: 'ventral',
    label: 'Ventral Vagal',
    subtitle: 'Safe · Social · Connected',
    color: 'var(--color-accent)',
    body: 'Connection, curiosity, eye contact, laughter, a slow breath. The state in which clinical work is actually integrated.',
    cues: ['Easy eye contact', 'Slow steady breath', 'Warm to presence', 'Open posture'],
  },
  {
    key: 'sympathetic',
    label: 'Sympathetic',
    subtitle: 'Mobilized · Fight or Flight',
    color: 'var(--color-primary)',
    body: 'Activation, urgency, racing thoughts, clenched jaw, the impulse to run, defend, or control the room.',
    cues: ['Shallow rapid breath', 'Heart rate up', 'Tight chest / jaw', 'Urge to move / flee'],
  },
  {
    key: 'dorsal',
    label: 'Dorsal Vagal',
    subtitle: 'Immobilized · Freeze · Collapse',
    color: 'var(--color-primary-dark)',
    body: 'Numb, foggy, heavy, disconnected, dissociated. The nervous system has decided that conservation is safer than engagement.',
    cues: ['Foggy thinking', 'Heavy body', 'Flat affect', 'Disconnected / far away'],
  },
];

export default function PolyvagalLens() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="polyvagal-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 55% at 85% 10%, rgba(216,137,102,0.08) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Polyvagal-Informed Lens</p>
          <h2
            id="polyvagal-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3rem)', lineHeight: 1.05 }}
          >
            Every session reads the <em className="not-italic text-primary">nervous system first</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            We recognize the central role of the autonomic nervous system in
            healing. Clinicians track which state a client is in before any
            intervention — because the intervention the nervous system needs
            changes with the state.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
          {/* Ladder SVG */}
          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <PolyvagalLadder active={visible} />
          </div>

          {/* State detail cards */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            {states.map((s, i) => (
              <article
                key={s.key}
                className="rounded-2xl bg-warm-bg p-6 lg:p-7 border border-black/5"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.14}s`,
                }}
              >
                <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  <h3
                    className="text-foreground font-bold"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}
                  >
                    {s.label}
                  </h3>
                  <span
                    className="text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground/55"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.subtitle}
                  </span>
                </div>
                <p className="text-foreground/75 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.body}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {s.cues.map((cue) => (
                    <li
                      key={cue}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-foreground/70 bg-white border border-black/5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                      {cue}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * PolyvagalLadder — three stacked horizontal bands with a ladder rail
 * on the left. A small indicator dot animates up the rail when
 * active, from dorsal → sympathetic → ventral, pausing briefly at
 * each rung.
 */
function PolyvagalLadder({ active }: { active: boolean }) {
  return (
    <div className="w-full aspect-[4/5] lg:aspect-[3/4] relative rounded-2xl overflow-hidden bg-warm-bg border border-black/5">
      <svg viewBox="0 0 400 500" className="w-full h-full" role="img" aria-label="Polyvagal ladder: dorsal, sympathetic, and ventral vagal states stacked with an indicator climbing toward safety.">
        <defs>
          <linearGradient id="pvBandVentral" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="pvBandSymp" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="pvBandDorsal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary-dark)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-primary-dark)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Three state bands */}
        <rect x="0" y="40" width="400" height="130" fill="url(#pvBandVentral)" />
        <rect x="0" y="170" width="400" height="130" fill="url(#pvBandSymp)" />
        <rect x="0" y="300" width="400" height="140" fill="url(#pvBandDorsal)" />

        {/* Band labels */}
        <text x="370" y="65" textAnchor="end" fill="var(--color-accent)" fontFamily="var(--font-body)" fontSize="10" fontWeight="700" letterSpacing="3.5" style={{ textTransform: 'uppercase' }}>Ventral · Safe</text>
        <text x="370" y="195" textAnchor="end" fill="var(--color-primary)" fontFamily="var(--font-body)" fontSize="10" fontWeight="700" letterSpacing="3.5" style={{ textTransform: 'uppercase' }}>Sympathetic</text>
        <text x="370" y="325" textAnchor="end" fill="var(--color-primary-dark)" fontFamily="var(--font-body)" fontSize="10" fontWeight="700" letterSpacing="3.5" style={{ textTransform: 'uppercase' }}>Dorsal · Collapse</text>

        {/* Band body glyphs — a very simple body outline in each band */}
        {/* Ventral body — upright, open */}
        <g transform="translate(85, 70)" stroke="var(--color-accent)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="20" cy="10" r="7" />
          <path d="M20 18v30" />
          <path d="M8 28l12-6 12 6" />
          <path d="M12 50l8-4 8 4" />
        </g>
        {/* Sympathetic body — leaning, arms up */}
        <g transform="translate(85, 200)" stroke="var(--color-primary)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="20" cy="10" r="7" />
          <path d="M20 18v22 M20 40l-6 14 M20 40l6 14" />
          <path d="M8 22l12 6 12-6" />
        </g>
        {/* Dorsal body — curled / heavy */}
        <g transform="translate(80, 335)" stroke="var(--color-primary-dark)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="7" />
          <path d="M14 40c0-8 6-14 12-14s12 6 12 14" />
          <path d="M10 54l12-4" opacity="0.6" />
          <path d="M28 50l12 4" opacity="0.6" />
        </g>

        {/* Ladder rail on the left */}
        <line x1="50" y1="40" x2="50" y2="440" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        {/* Rungs */}
        {[105, 235, 370].map((y) => (
          <line key={y} x1="38" y1={y} x2="62" y2={y} stroke="rgba(0,0,0,0.18)" strokeWidth="1.25" />
        ))}

        {/* Climbing indicator */}
        <g
          style={{
            opacity: active ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <circle r="7" fill="white" stroke="var(--color-accent)" strokeWidth="2">
            <animate
              attributeName="cx"
              values="50"
              dur="0.01s"
              fill="freeze"
            />
            <animate
              attributeName="cy"
              values="370;370;235;235;105;105"
              keyTimes="0;0.2;0.45;0.65;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Pulsing halo that follows */}
          <circle r="10" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5">
            <animate attributeName="cx" values="50" dur="0.01s" fill="freeze" />
            <animate
              attributeName="cy"
              values="370;370;235;235;105;105"
              keyTimes="0;0.2;0.45;0.65;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
            <animate attributeName="r" values="9;14;9" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Bottom label */}
        <text
          x="200"
          y="475"
          textAnchor="middle"
          fill="rgba(0,0,0,0.5)"
          fontFamily="var(--font-display)"
          fontSize="13"
          fontStyle="italic"
        >
          co-regulation climbs the ladder
        </text>
      </svg>
    </div>
  );
}
