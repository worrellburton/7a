'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 3. Big editorial pull-quote on the
 * relational primacy of healing, with a custom two-arc SVG glyph
 * whose strokes intertwine when the section scrolls in. The quote
 * "Modalities support the process. Relationship drives the outcome."
 * is the page's thesis, so this section is intentionally spacious
 * and dark-section so it reads as a set piece.
 */
export default function RelationalInsight() {
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-dark-section text-white"
      aria-labelledby="relational-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 85% 45%, rgba(216,137,102,0.24) 0%, rgba(216,137,102,0) 60%), radial-gradient(ellipse 45% 50% at 10% 90%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The Thesis
            </p>
            <h2
              id="relational-heading"
              className="font-bold tracking-tight mb-10"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 4.8vw, 4rem)',
                lineHeight: 1.02,
              }}
            >
              The therapeutic relationship is the{' '}
              <em className="not-italic" style={{ color: 'var(--color-accent)' }}>most influential factor</em>{' '}
              in healing.
            </h2>

            {/* Aphorism — two lines that feel chiseled in. */}
            <div
              className="border-l-2 border-accent/70 pl-6 lg:pl-7 mb-10 space-y-2"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-10px)',
                transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.4s',
              }}
            >
              <p
                className="text-white/85 text-xl lg:text-2xl leading-snug"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
              >
                Modalities support the process.
              </p>
              <p
                className="text-white text-xl lg:text-2xl leading-snug"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Relationship drives the outcome.
              </p>
            </div>

            <p
              className="text-white/80 leading-relaxed text-lg max-w-2xl"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.9s ease 0.7s',
              }}
            >
              Because of this, our clinical team prioritizes presence,
              attunement, and authenticity above all else. Our clinicians
              actively engage in their own nervous-system regulation practices,
              allowing them to offer what we consider the{' '}
              <span className="text-accent font-semibold">&ldquo;miracle intervention&rdquo;</span>{' '}
              &mdash; a regulated, grounded, safe human presence.
            </p>
          </div>

          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.25s',
            }}
          >
            <InterwovenArcs active={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * InterwovenArcs — two open-ended arcs that start separate and, on
 * scroll-in, rotate toward each other until their strokes interlace.
 * Stands in for the client/clinician relationship coming into
 * resonance with one another.
 */
function InterwovenArcs({ active }: { active: boolean }) {
  return (
    <div className="w-full mx-auto max-w-[440px] aspect-square relative">
      <svg viewBox="0 0 400 400" className="w-full h-full" role="img" aria-label="Two arcs interlacing to represent therapeutic relationship.">
        <defs>
          <linearGradient id="arcA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="arcB" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="arcGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint halo behind the meeting point */}
        <circle cx="200" cy="200" r="170" fill="url(#arcGlow)" />

        {/* Arc A — "clinician" */}
        <g
          style={{
            transformOrigin: '200px 200px',
            transform: active ? 'rotate(-10deg)' : 'rotate(-60deg)',
            transition: 'transform 2s cubic-bezier(0.22,1,0.36,1) 0.2s',
          }}
        >
          <path
            d="M 60 200 A 140 140 0 0 1 340 200"
            fill="none"
            stroke="url(#arcA)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={active ? 0 : 600}
            style={{ transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.4s' }}
          />
        </g>

        {/* Arc B — "client" */}
        <g
          style={{
            transformOrigin: '200px 200px',
            transform: active ? 'rotate(10deg)' : 'rotate(60deg)',
            transition: 'transform 2s cubic-bezier(0.22,1,0.36,1) 0.3s',
          }}
        >
          <path
            d="M 60 200 A 140 140 0 0 0 340 200"
            fill="none"
            stroke="url(#arcB)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={active ? 0 : 600}
            style={{ transition: 'stroke-dashoffset 2.4s cubic-bezier(0.22,1,0.36,1) 0.5s' }}
          />
        </g>

        {/* Intersection dot */}
        <g
          style={{
            opacity: active ? 1 : 0,
            transition: 'opacity 0.9s ease 1.6s',
          }}
        >
          <circle cx="200" cy="200" r="9" fill="white" />
          <circle cx="200" cy="200" r="14" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.7" />
        </g>

        {/* Endpoint labels */}
        <text
          x="58"
          y="240"
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontFamily="var(--font-body)"
          fontSize="10"
          fontWeight="700"
          letterSpacing="3"
          style={{ textTransform: 'uppercase' }}
        >
          Client
        </text>
        <text
          x="342"
          y="240"
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontFamily="var(--font-body)"
          fontSize="10"
          fontWeight="700"
          letterSpacing="3"
          style={{ textTransform: 'uppercase' }}
        >
          Clinician
        </text>
        <text
          x="200"
          y="176"
          textAnchor="middle"
          fill="rgba(255,255,255,0.75)"
          fontFamily="var(--font-display)"
          fontSize="14"
          fontStyle="italic"
          style={{
            opacity: active ? 1 : 0,
            transition: 'opacity 0.9s ease 2s',
          }}
        >
          presence
        </text>
      </svg>
    </div>
  );
}
