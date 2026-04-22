'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 2. Opening editorial statement on the
 * Rhoton / Gentry lineage. Two-column composition:
 *   - Left: a custom SVG motif showing the conceptual shift — an
 *     outer "symptom" ring that, once the section scrolls in, relaxes
 *     into an inner "self" core with outward-pointing rays of agency.
 *     The ring doesn't get fought; it gets loosened from within.
 *   - Right: eyebrow, serif headline, prose lede.
 *
 * Scroll-triggered animation on the SVG. No external libs.
 */

export default function FrameworkIntro() {
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="framework-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 18% 50%, rgba(216,137,102,0.12) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* SVG motif */}
          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-14px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <ShiftGlyph active={visible} />
          </div>

          {/* Editorial copy */}
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.25s',
            }}
          >
            <p className="section-label mb-5">The Framework</p>
            <h2
              id="framework-heading"
              className="text-foreground font-bold tracking-tight mb-7"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 3.1rem)',
                lineHeight: 1.02,
              }}
            >
              Healing is not <em className="not-italic text-primary/70 line-through decoration-primary/40">force</em>. It is a <em className="not-italic text-primary">return</em>.
            </h2>
            <div
              className="space-y-5 text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <p>
                Our clinical approach is grounded in the empowerment and
                resilience-based frameworks of{' '}
                <span className="text-foreground font-semibold">Dr. Robert Rhoton</span> and{' '}
                <span className="text-foreground font-semibold">Dr. J. Eric Gentry</span>.
                We believe healing occurs not through force or pathology, but
                through the restoration of <em className="not-italic">safety</em>,{' '}
                <em className="not-italic">connection</em>, and{' '}
                <em className="not-italic">self-leadership</em>.
              </p>
              <p className="text-foreground/65">
                Our work is guided by a simple but powerful truth: the
                therapeutic relationship is the most influential factor in
                healing. Modalities support the process — relationship drives
                the outcome.
              </p>
            </div>

            {/* Authority chips */}
            <div className="mt-10 flex flex-wrap items-center gap-2.5">
              {[
                'Empowerment-based',
                'Resilience-informed',
                'Polyvagal-aware',
                'Non-pathologizing',
              ].map((chip, i) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 bg-white border border-black/5"
                  style={{
                    fontFamily: 'var(--font-body)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(6px)',
                    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.6 + i * 0.08}s`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ShiftGlyph — custom SVG showing the "from pathology to restoration"
 * move visually. An outer ring starts tight and rotated; on scroll-in
 * it loosens, the inner core lights up, and eight outward-pointing
 * rays of agency unfurl around it.
 */
function ShiftGlyph({ active }: { active: boolean }) {
  return (
    <div className="w-full mx-auto max-w-[440px] aspect-square relative">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        role="img"
        aria-label="Diagram: symptom ring loosens around a restored self core with rays of agency extending outward."
      >
        <defs>
          <radialGradient id="fiCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
            <stop offset="70%" stopColor="var(--color-primary)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fiBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient halo */}
        <circle cx="200" cy="200" r="170" fill="url(#fiBg)" />

        {/* Outer "symptom" ring — starts dashed-tight and rotated,
            relaxes on active. */}
        <g
          style={{
            transformOrigin: '200px 200px',
            transform: active ? 'rotate(22deg)' : 'rotate(-16deg)',
            transition: 'transform 2.2s cubic-bezier(0.22,1,0.36,1) 0.2s',
          }}
        >
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke="var(--color-primary)"
            strokeOpacity="0.45"
            strokeWidth="1.25"
            strokeDasharray={active ? '18 14' : '4 8'}
            style={{
              transition: 'stroke-dasharray 2s cubic-bezier(0.22,1,0.36,1) 0.2s',
            }}
          />
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke="var(--color-primary)"
            strokeOpacity="0.18"
            strokeWidth="1"
          />
        </g>

        {/* Eight agency rays — fan outward as active flips. */}
        <g
          style={{
            transformOrigin: '200px 200px',
            opacity: active ? 1 : 0,
            transition: 'opacity 1s ease 0.9s',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const r1 = 95;
            const r2 = active ? 170 : 105;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * r1}
                y1={200 + Math.sin(a) * r1}
                x2={200 + Math.cos(a) * r2}
                y2={200 + Math.sin(a) * r2}
                stroke="var(--color-accent)"
                strokeOpacity="0.75"
                strokeWidth="1.25"
                strokeLinecap="round"
                style={{
                  transition: `x2 1.4s cubic-bezier(0.22,1,0.36,1) ${0.9 + i * 0.05}s, y2 1.4s cubic-bezier(0.22,1,0.36,1) ${0.9 + i * 0.05}s`,
                }}
              />
            );
          })}
        </g>

        {/* Inner "self" ring */}
        <circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={active ? 0.8 : 0.2}
          strokeWidth="1.5"
          style={{ transition: 'stroke-opacity 1.4s ease 0.6s' }}
        />

        {/* Self core */}
        <circle
          cx="200"
          cy="200"
          r={active ? 56 : 40}
          fill="url(#fiCore)"
          style={{ transition: 'r 1.6s cubic-bezier(0.22,1,0.36,1) 0.4s' }}
        />
        <circle
          cx="200"
          cy="200"
          r="6"
          fill="var(--color-accent)"
        />

        {/* Labels */}
        <text
          x="200"
          y="35"
          textAnchor="middle"
          fill="var(--color-primary)"
          fontFamily="var(--font-body)"
          fontSize="10"
          fontWeight="700"
          letterSpacing="4"
          style={{ textTransform: 'uppercase' }}
        >
          SYMPTOM
        </text>
        <text
          x="200"
          y="374"
          textAnchor="middle"
          fill="var(--color-primary)"
          fontFamily="var(--font-body)"
          fontSize="10"
          fontWeight="700"
          letterSpacing="4"
          style={{ textTransform: 'uppercase' }}
        >
          PATHOLOGY
        </text>
        <text
          x="200"
          y="210"
          textAnchor="middle"
          fill="#1a1a1a"
          fontFamily="var(--font-display)"
          fontSize="16"
          fontStyle="italic"
          style={{
            opacity: active ? 1 : 0,
            transition: 'opacity 0.9s ease 1.2s',
          }}
        >
          self
        </text>
      </svg>
    </div>
  );
}
