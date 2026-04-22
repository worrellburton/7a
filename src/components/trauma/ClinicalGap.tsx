'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 2 — "The Clinical Gap".
 *
 * Left column: eyebrow + serif heading + two paragraphs explaining why
 * trauma and addiction have historically been split into separate
 * clinical lanes.
 *
 * Right column: an animated SVG glyph showing a "Trauma" ring and an
 * "Addiction" ring that, on scroll-in, slide into each other to create
 * a Venn intersection — a visual restatement of the thesis: these
 * conditions cannot be separated. A subtle polyvagal waveform pulses
 * along the bottom to suggest nervous-system activation.
 *
 * Scroll trigger uses IntersectionObserver so the animation plays once
 * when the section enters the viewport, not on every paint.
 */
export default function ClinicalGap() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-20 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="clinical-gap-heading"
    >
      {/* Soft vignette anchor so the eye settles on the composition */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 72% 50%, rgba(188,107,74,0.08) 0%, rgba(188,107,74,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">The Clinical Gap</p>
            <h2
              id="clinical-gap-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.6vw, 2.8rem)',
                lineHeight: 1.08,
              }}
            >
              Why traditional models fall short.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Trauma and addiction have historically been treated as
              separate clinical domains. Trauma-focused therapies often
              rely on exposure and memory processing, which may
              destabilize individuals in early recovery by increasing
              arousal and craving activation. Meanwhile, substance-use
              treatment prioritizes stabilization, often delaying
              trauma work indefinitely.
            </p>
            <p
              className="text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              This creates a clinical gap where trauma remains unaddressed
              while addiction persists. The ACE study demonstrated that
              individuals with higher adverse childhood experience scores
              show significantly increased risk for both addiction and
              mental health challenges &mdash; confirming what our clinicians
              see every day: <strong>these conditions cannot be separated</strong>.
            </p>
          </div>

          <div className="lg:col-span-6">
            <GapGlyph visible={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Two-circle Venn glyph animation. Rings start apart and slide
 * inward as the section scrolls into view. A polyvagal-style
 * waveform oscillates underneath continuously.
 */
function GapGlyph({ visible }: { visible: boolean }) {
  // Starting offsets for the two rings.
  const leftOffset = visible ? -60 : -180;
  const rightOffset = visible ? 60 : 180;
  const mergedOpacity = visible ? 1 : 0;

  return (
    <div className="w-full mx-auto max-w-[520px] aspect-[7/6] relative">
      <svg
        viewBox="0 0 700 600"
        className="w-full h-full"
        role="img"
        aria-label="Trauma and addiction rendered as two intersecting rings that merge into one integrated condition."
      >
        <defs>
          <radialGradient id="gapRingFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="gapWave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ring A — "Trauma" */}
        <g
          style={{
            transform: `translate(${leftOffset}px, 0)`,
            transformOrigin: '350px 300px',
            transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s',
          }}
        >
          <circle
            cx="350"
            cy="300"
            r="170"
            fill="url(#gapRingFill)"
            stroke="var(--color-primary)"
            strokeOpacity="0.55"
            strokeWidth="1.25"
          />
          <text
            x="350"
            y="155"
            textAnchor="middle"
            fill="var(--color-primary)"
            fontFamily="var(--font-body)"
            fontSize="13"
            fontWeight="600"
            letterSpacing="3.5"
            style={{ textTransform: 'uppercase' }}
          >
            TRAUMA
          </text>
        </g>

        {/* Ring B — "Addiction" */}
        <g
          style={{
            transform: `translate(${rightOffset}px, 0)`,
            transformOrigin: '350px 300px',
            transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.25s',
          }}
        >
          <circle
            cx="350"
            cy="300"
            r="170"
            fill="url(#gapRingFill)"
            stroke="var(--color-accent)"
            strokeOpacity="0.65"
            strokeWidth="1.25"
          />
          <text
            x="350"
            y="465"
            textAnchor="middle"
            fill="var(--color-accent)"
            fontFamily="var(--font-body)"
            fontSize="13"
            fontWeight="600"
            letterSpacing="3.5"
            style={{ textTransform: 'uppercase' }}
          >
            ADDICTION
          </text>
        </g>

        {/* Intersection label */}
        <g
          style={{
            opacity: mergedOpacity,
            transition: 'opacity 0.9s ease 1.25s',
          }}
        >
          <circle cx="350" cy="300" r="7" fill="var(--color-primary)" />
          <text
            x="350"
            y="335"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="22"
            fontStyle="italic"
            fill="#1a1a1a"
          >
            one condition
          </text>
          <text
            x="350"
            y="358"
            textAnchor="middle"
            fontFamily="var(--font-body)"
            fontSize="10"
            letterSpacing="3"
            fill="#1a1a1aaa"
            style={{ textTransform: 'uppercase' }}
          >
            TraumAddiction
          </text>
        </g>

        {/* Polyvagal-style waveform, always animating */}
        <g
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 1.4s',
          }}
        >
          <path
            d="M 40 540 Q 140 500 240 540 T 440 540 T 660 540"
            fill="none"
            stroke="url(#gapWave)"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              dur="6.5s"
              repeatCount="indefinite"
              values="
                M 40 540 Q 140 500 240 540 T 440 540 T 660 540;
                M 40 540 Q 140 560 240 530 T 440 545 T 660 540;
                M 40 540 Q 140 510 240 555 T 440 525 T 660 540;
                M 40 540 Q 140 500 240 540 T 440 540 T 660 540
              "
            />
          </path>
          <path
            d="M 40 555 Q 140 520 240 555 T 440 555 T 660 555"
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              dur="5s"
              repeatCount="indefinite"
              values="
                M 40 555 Q 140 520 240 555 T 440 555 T 660 555;
                M 40 555 Q 140 575 240 545 T 440 560 T 660 555;
                M 40 555 Q 140 525 240 570 T 440 540 T 660 555;
                M 40 555 Q 140 520 240 555 T 440 555 T 660 555
              "
            />
          </path>
        </g>
      </svg>
    </div>
  );
}
