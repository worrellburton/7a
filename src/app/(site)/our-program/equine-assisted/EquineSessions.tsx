'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Phase 5 — Session modalities.
 *
 * A three-stage animated SVG diagram (Observation → Relational
 * Process → Integration) that walks the visitor through how an EAP
 * session actually unfolds. Each stage is keyword-dense so crawlers
 * and LLMs can cite the specific interventions (somatic tracking,
 * IFS parts work, polyvagal-informed regulation) rather than generic
 * "we work with horses" filler.
 */

interface Stage {
  number: string;
  title: string;
  duration: string;
  body: string;
  bullets: { label: string; body: string }[];
  glyph: ReactNode;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const stages: Stage[] = [
  {
    number: '01',
    title: 'Observation & Arrival',
    duration: '~15 min',
    body:
      'The client enters the arena as the herd is present, with space to slow down and observe initial interactions, including shifts in proximity, breath, and posture.',
    bullets: [
      {
        label: 'Somatic Check-In & Attunement',
        body: 'Tracking body sensations, nervous system state, and presence',
      },
      {
        label: 'Nervous System Baseline',
        body: 'Assessing regulation to guide pacing',
      },
      {
        label: 'Herd Awareness',
        body: 'Noticing relational dynamics, boundaries, and connection patterns',
      },
    ],
    glyph: (
      <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" {...s}>
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="3" />
        <path d="M16 4v2M16 26v2M4 16h2M26 16h2" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Relational & Experiential Process',
    duration: '~30 min',
    body:
      'Sessions center on attunement, presence, and real-time relational feedback with the herd. The horse reflects the client&rsquo;s internal state — shifts in regulation, authenticity, and connection — offering immediate, nonverbal insight. The clinician supports the client in tracking what is happening internally and within the relationship, using this awareness to guide the work.',
    bullets: [
      {
        label: 'IFS / Parts Awareness',
        body: 'Identifying and engaging with protective and vulnerable parts as they emerge',
      },
      {
        label: 'Somatic Tracking',
        body: 'Noticing body sensations, activation, and regulation in the moment',
      },
      {
        label: 'Polyvagal-Informed Regulation',
        body: 'Supporting nervous system awareness, co-regulation, and safety cues',
      },
      {
        label: 'Relational Attunement',
        body: 'Exploring connection, boundaries, and patterns as reflected through the horse',
      },
    ],
    glyph: (
      <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" {...s}>
        <path d="M6 22c3-4 6-5 10-5s7 1 10 5" />
        <circle cx="12" cy="14" r="2" />
        <circle cx="20" cy="14" r="2" />
        <path d="M14 8l2-3 2 3" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Trauma-Informed Integration',
    duration: '~15 min',
    body:
      'The client returns to a grounded space at the edge of the arena to support stabilization and reflection. The clinician facilitates gentle meaning-making of the experiential work, linking present-moment observations to the client&rsquo;s presenting concerns and treatment goals in a paced, consent-based manner.',
    bullets: [
      {
        label: 'IFS Parts-Based Framing',
        body: 'Naming the parts that showed up and what they were carrying',
      },
      {
        label: 'Somatic Felt-Sense Mapping',
        body: 'Linking the body&rsquo;s response to the emotional and relational story',
      },
      {
        label: 'Plan-of-Care Integration',
        body: 'Connecting insight from the arena to the broader treatment plan',
      },
    ],
    glyph: (
      <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" {...s}>
        <path d="M5 16c3-6 8-9 11-9s8 3 11 9" />
        <path d="M5 16c3 6 8 9 11 9s8-3 11-9" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    ),
  },
];

export default function EquineSessions() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
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
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="sessions-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Inside a session</p>
          <h2
            id="sessions-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Sixty minutes. Three <em className="not-italic text-primary">arcs</em>.
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-[16.5px] mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Each group session is co-facilitated by a licensed clinician, an
            equine specialist, and the herd, creating a structured and
            supported therapeutic environment. Individual sessions are guided
            by a licensed therapist in partnership with the herd, offering a
            more private, attuned space for deeper exploration and healing.
          </p>
          <p
            className="text-foreground/70 leading-relaxed text-[16.5px]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sessions are intentionally flexible and trauma-informed, adapting
            to meet the client&rsquo;s needs in real time. While there may be
            an initial intention or focus, the work is guided by what emerges
            in the moment — often reflected through the horses&rsquo;
            responses and the client&rsquo;s internal experience. This allows
            the process to remain responsive, client-centered, and grounded in
            present-moment awareness.
          </p>
        </div>

        <AnimatedArcDiagram visible={visible} />

        <div className="mt-14 lg:mt-16 grid md:grid-cols-3 gap-6 lg:gap-7">
          {stages.map((stage, i) => (
            <article
              key={stage.number}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.15}s`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-primary-dark"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(216,137,102,0.2) 0%, rgba(107,42,20,0.08) 100%)',
                  }}
                  aria-hidden="true"
                >
                  {stage.glyph}
                </div>
                <span
                  className="text-[10px] tracking-[0.22em] uppercase font-bold text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {stage.number} · {stage.duration}
                </span>
              </div>
              <h3
                className="text-foreground font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  lineHeight: 1.15,
                }}
              >
                {stage.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-[15px] mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
                dangerouslySetInnerHTML={{ __html: stage.body }}
              />
              <ul className="space-y-3">
                {stage.bullets.map((b) => (
                  <li
                    key={b.label}
                    className="flex items-start gap-2.5 text-[13.5px] text-foreground/75"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-primary shrink-0 mt-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>
                      <strong className="font-semibold text-foreground">{b.label}:</strong>{' '}
                      <span className="text-foreground/70">{b.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Horizontal animated arc connecting the three stages. Uses
 * stroke-dasharray to draw a path across the width of the section
 * when it comes into view. Three marker dots pulse in sequence.
 */
function AnimatedArcDiagram({ visible }: { visible: boolean }) {
  return (
    <div
      className="relative w-full h-24 md:h-32 mx-auto"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease 0.2s',
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1200 160" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.15" />
          </linearGradient>
          <style>{`
            @keyframes drawArc { to { stroke-dashoffset: 0; } }
            @keyframes pulse { 0%, 100% { r: 7; opacity: 0.9; } 50% { r: 10; opacity: 1; } }
            .arc-path { stroke-dasharray: 1400; stroke-dashoffset: ${visible ? 0 : 1400}; transition: stroke-dashoffset 2.2s cubic-bezier(0.16,1,0.3,1) 0.25s; }
            .arc-dot { animation: pulse 2.6s ease-in-out infinite; }
            .arc-dot-1 { animation-delay: 0s; }
            .arc-dot-2 { animation-delay: 0.8s; }
            .arc-dot-3 { animation-delay: 1.6s; }
          `}</style>
        </defs>
        {/* Curving path Observation → Process → Integration */}
        <path
          d="M 80 80 Q 300 20, 600 80 T 1120 80"
          className="arc-path"
          fill="none"
          stroke="url(#arcGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Endpoint + midpoint dots */}
        <circle cx="80" cy="80" r="7" className="arc-dot arc-dot-1" fill="var(--color-primary)" />
        <circle cx="600" cy="80" r="7" className="arc-dot arc-dot-2" fill="var(--color-primary)" />
        <circle cx="1120" cy="80" r="7" className="arc-dot arc-dot-3" fill="var(--color-primary)" />
        {/* Ambient sparkle — a subtle rider crossing */}
        <circle cx="200" cy="60" r="1.5" fill="var(--color-accent)" opacity="0.6" />
        <circle cx="880" cy="50" r="1.5" fill="var(--color-accent)" opacity="0.6" />
      </svg>
    </div>
  );
}
