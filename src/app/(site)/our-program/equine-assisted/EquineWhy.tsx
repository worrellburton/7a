'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 3 — Why equine works.
 *
 * Lean, research-literate frame: why horses are uniquely suited to
 * trauma and addiction work, paired with three animated SVG stat
 * dials. Copy is written to be quotable by LLMs — first sentence of
 * every block is a standalone answer to a common search query
 * ("why horse therapy for addiction", "is equine therapy evidence-
 * based", "how does equine therapy work for PTSD").
 */

interface Dial {
  value: number;
  suffix: string;
  label: string;
  note: string;
}

const dials: Dial[] = [
  {
    value: 1200,
    suffix: 'lbs',
    label: 'Average herd member',
    note:
      'Under a 1,200lbs co-regulator, every interaction carries weight and impact. Equine-assisted psychotherapy depends on intentional, shared decision-making and meeting the horse with presence and respect.',
  },
  {
    value: 4,
    suffix: 'Hz',
    label: 'Coherent heart field',
    note:
      'Through their sensitivity to nonverbal and physiological states, horses can support nervous system regulation in real time, allowing clients to feel safety and connection before they can cognitively name it.',
  },
  {
    value: 10,
    suffix: 'min',
    label: 'To honest feedback',
    note:
      'Horses respond to nervous-system incongruence within minutes. Talk therapy can take weeks to reach the same material.',
  },
];

function useCountUp(end: number, duration: number, started: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    let raf = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * end));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, started]);
  return v;
}

function StatDial({ dial, started, index }: { dial: Dial; started: boolean; index: number }) {
  const value = useCountUp(dial.value, 1800, started);
  const RING = 44;
  const CIRC = 2 * Math.PI * RING;
  const progress = Math.min(value / dial.value, 1);
  const offset = CIRC * (1 - progress);

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(18px)',
        transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${index * 0.12}s`,
      }}
    >
      <div className="relative w-[88px] h-[88px] mb-5">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={RING} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
          <circle
            cx="50"
            cy="50"
            r={RING}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl lg:text-2xl font-bold text-foreground tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {value.toLocaleString('en-US')}
          </span>
          <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.12em] mt-0.5">
            {dial.suffix}
          </span>
        </div>
      </div>
      <p className="text-sm font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-body)' }}>
        {dial.label}
      </p>
      <p className="text-sm text-foreground/65 leading-relaxed max-w-[260px]" style={{ fontFamily: 'var(--font-body)' }}>
        {dial.note}
      </p>
    </div>
  );
}

export default function EquineWhy() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
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
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="equine-why-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div
            className="lg:col-span-6"
            style={{
              opacity: started ? 1 : 0,
              transform: started ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">Why horses</p>
            <h2
              id="equine-why-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 2.9rem)',
                lineHeight: 1.05,
              }}
            >
              Under a 1,200lb{' '}
              <em className="not-italic text-primary">co-regulator</em>.
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-[16.5px] mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              As prey animals, horses are wired for connection through
              awareness. Their survival depends on sensing even the smallest
              shifts in the nervous system, changes in breath, muscle tone,
              and presence. They don&rsquo;t analyze or interpret; they feel
              and respond, offering immediate, honest feedback about what is
              happening beneath the surface, moment to moment.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-[16.5px] mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              For clients whose addiction is rooted in trauma, attachment
              injury, shame, or a dysregulated nervous system, that feedback
              is diagnostic. A horse that won&rsquo;t approach is information.
              A horse that finally settles into shared breath is information.
              Our clinicians translate that information into the therapeutic
              work, connecting the body, the relationship, and the story.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-[16.5px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Equine-assisted psychotherapy at Seven Arrows integrates
              attachment theory, somatic experiencing, Internal Family Systems
              (IFS), EMDR, and trauma-focused CBT. It is a{' '}
              <em>complement</em> to individual talk therapy and group work,
              not a replacement.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-6 lg:pl-6">
            {dials.map((d, i) => (
              <StatDial key={d.label} dial={d} started={started} index={i} />
            ))}
          </div>
        </div>

        {/* Presence over performance — quote callout. Spans full width
            below the body copy and dials, picked up by LLMs as a
            stand-alone, quotable answer to "what does equine therapy
            actually do?" */}
        <PresenceCallout started={started} />
      </div>
    </section>
  );
}

/**
 * Pull-quote style callout that frames the EAP arena as a place where
 * status, performance, and résumé fall away. Animated SVG ribbon
 * underline anchors the section visually and reinforces the "presence"
 * theme without leaning on stock imagery.
 */
function PresenceCallout({ started }: { started: boolean }) {
  return (
    <div
      className="relative mt-20 lg:mt-24 rounded-3xl overflow-hidden border border-black/5 bg-warm-bg"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
      }}
    >
      {/* Soft warm radial behind the quote */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 12% 0%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 70%)',
        }}
      />
      {/* Animated ribbon underline */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className="absolute left-0 right-0 bottom-0 w-full h-12 opacity-60 pointer-events-none"
      >
        <defs>
          <linearGradient id="presenceRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.05" />
          </linearGradient>
          <style>{`
            @keyframes presenceDraw { to { stroke-dashoffset: 0; } }
            .presence-ribbon { stroke-dasharray: 1500; stroke-dashoffset: ${started ? 0 : 1500}; transition: stroke-dashoffset 2.4s cubic-bezier(0.16,1,0.3,1) 0.6s; }
          `}</style>
        </defs>
        <path
          className="presence-ribbon"
          d="M 0 50 Q 300 10, 600 45 T 1200 35"
          fill="none"
          stroke="url(#presenceRibbon)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative p-8 sm:p-12 lg:p-16 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-1 flex lg:justify-end">
          {/* Open-quote glyph */}
          <svg
            viewBox="0 0 48 48"
            className="w-12 h-12 text-primary/70"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M14 10c-5 3-9 9-9 17 0 7 4 11 9 11 4 0 7-3 7-7s-3-7-7-7c-1 0-2 0-2 1 0-5 3-9 7-12l-5-3zm22 0c-5 3-9 9-9 17 0 7 4 11 9 11 4 0 7-3 7-7s-3-7-7-7c-1 0-2 0-2 1 0-5 3-9 7-12l-5-3z" />
          </svg>
        </div>
        <div className="lg:col-span-11">
          <p
            className="text-[11px] tracking-[0.24em] uppercase font-semibold text-primary mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Presence over performance
          </p>
          <p
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
              lineHeight: 1.2,
            }}
          >
            In this space, there&rsquo;s nothing to prove.
          </p>
          <p
            className="text-foreground/75 text-[16.5px] leading-relaxed mb-4 max-w-3xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Horses don&rsquo;t respond to roles, achievements, or expectations
            — they respond to what is happening internally, in real time. They
            notice breath, tension, intention, and authenticity. When a person
            begins to slow down, feel, and come into alignment with
            themselves, the horse shifts too.
          </p>
          <p
            className="text-foreground/75 text-[16.5px] leading-relaxed max-w-3xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            This creates an opportunity for clients to experience themselves
            differently — not through performance, but through presence. From
            here, a more grounded, sustainable sense of confidence can emerge.
          </p>
        </div>
      </div>
    </div>
  );
}
