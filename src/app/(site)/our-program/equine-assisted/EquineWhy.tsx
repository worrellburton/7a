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
    value: 2200,
    suffix: 'lbs',
    label: 'Average herd member',
    note:
      'Horses weigh ten times what a person weighs. Every shared decision matters.',
  },
  {
    value: 4,
    suffix: 'Hz',
    label: 'Coherent heart field',
    note:
      'A horse’s heart generates an electromagnetic field five times stronger than a human’s — clients can feel regulation before they can name it.',
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
      <div className="relative w-[112px] h-[112px] mb-5">
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
            className="text-2xl lg:text-3xl font-bold text-foreground tabular-nums"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {value.toLocaleString('en-US')}
          </span>
          <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.12em]">
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
              A 1,200-pound co-regulator with{' '}
              <em className="not-italic text-primary">no agenda</em>.
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-[16.5px] mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Horses are prey animals, which means their survival depends on
              reading nervous-system states in the animals around them with
              extraordinary precision. They don&rsquo;t respond to the story a
              client tells about themselves. They respond to what&rsquo;s
              actually happening in the body — tension, breath, orientation,
              intent — moment to moment.
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
              work — connecting the body, the relationship, and the story.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-[16.5px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Equine-assisted psychotherapy at Seven Arrows integrates
              attachment theory, somatic experiencing, Internal Family Systems
              (IFS), and trauma-focused CBT. It is a <em>complement</em> to
              individual talk therapy, group, EMDR, and ART — not a
              replacement.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-6 lg:pl-6">
            {dials.map((d, i) => (
              <StatDial key={d.label} dial={d} started={started} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
