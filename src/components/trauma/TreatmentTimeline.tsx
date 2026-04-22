'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 7 — Treatment timeline.
 *
 * A horizontal week-by-week stepper showing the arc of a trauma-focused
 * residential stay. Desktop shows all stops in a connected rail with
 * a progress line that paints in on scroll-in; mobile falls back to a
 * snap-scroll rail. Each stop has a week range, a clinical focus
 * title, and one sentence of copy.
 */

const stops = [
  {
    week: 'Week 1',
    focus: 'Arrival & stabilization',
    body:
      'Intake, medical clearance, acute safety and comfort. Nervous-system grounding before any deeper clinical work.',
  },
  {
    week: 'Weeks 2–3',
    focus: 'Capacity building',
    body:
      'Breathwork, interoception practice, psychoeducation on the threat response. Learning to read the body.',
  },
  {
    week: 'Weeks 3–5',
    focus: 'Somatic & equine',
    body:
      'Somatic Experiencing, body-based groups, and equine-assisted psychotherapy begin — attuning to pre-verbal truth.',
  },
  {
    week: 'Weeks 5–8',
    focus: 'TraumAddiction processing',
    body:
      'With capacity in place, clients engage present-focused trauma processing inside the Forward-Facing Freedom model.',
  },
  {
    week: 'Weeks 8–10',
    focus: 'Meaning & mission',
    body:
      'Values work, personal code of honor, recovery mission statement. Purpose replaces shame as the organizing force.',
  },
  {
    week: 'Weeks 10–12',
    focus: 'Reentry & aftercare',
    body:
      'Family program, relapse-prevention planning, alumni community integration. A runway, not a cliff edge.',
  },
];

export default function TreatmentTimeline() {
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
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="timeline-heading"
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
          <p className="section-label mb-5">The Arc of a Stay</p>
          <h2
            id="timeline-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            Twelve weeks, paced to the nervous system.
          </h2>
        </div>

        {/* Desktop connected rail */}
        <div className="relative hidden lg:block">
          <div className="absolute left-0 right-0 top-10 h-px bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-0 top-10 h-px"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              width: visible ? '100%' : '0%',
              transition: 'width 2.2s cubic-bezier(0.22,1,0.36,1) 0.3s',
            }}
          />
          <div className="grid grid-cols-6 gap-5">
            {stops.map((s, i) => (
              <div
                key={s.week}
                className="relative pt-16"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.12}s`,
                }}
              >
                <span
                  className="absolute left-0 top-[34px] w-4 h-4 rounded-full"
                  style={{
                    background: 'var(--color-primary)',
                    boxShadow: '0 0 0 5px rgba(188,107,74,0.15)',
                  }}
                  aria-hidden="true"
                />
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-primary mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.week}
                </p>
                <h3 className="text-foreground font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.2 }}>
                  {s.focus}
                </h3>
                <p className="text-foreground/70 text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile / tablet snap rail */}
        <div className="lg:hidden no-scrollbar flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {stops.map((s, i) => (
            <article
              key={s.week}
              className="snap-center shrink-0 w-[78vw] sm:w-[56vw] border border-black/5 rounded-2xl p-6 bg-warm-bg"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.1}s`,
              }}
            >
              <span className="w-3 h-3 rounded-full bg-primary block mb-4" aria-hidden="true" />
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-primary mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                {s.week}
              </p>
              <h3 className="text-foreground font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
                {s.focus}
              </h3>
              <p className="text-foreground/70 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
