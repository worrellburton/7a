'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Pillar {
  title: string;
  body: string;
  glyph: ReactElement;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const pillars: Pillar[] = [
  {
    title: 'Small caseloads, real depth',
    body:
      'Primary clinicians carry 4–6 clients at a time instead of the 15–20 typical of larger programs. You do the work you were trained to do, not triage.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><circle cx="16" cy="11" r="4" /><path d="M6 26c1.5-5 5-8 10-8s8.5 3 10 8" /></svg>),
  },
  {
    title: 'Trauma-informed, top to bottom',
    body:
      'Our TraumAddiction™ framework runs through every role — clinical, medical, ops, kitchen. You are not fighting the system to hold the window open.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><path d="M16 5l9 3v8c0 6-4 10-9 11-5-1-9-5-9-11V8l9-3z" /><path d="M12 16l3 3 5-6" /></svg>),
  },
  {
    title: 'A team that actually talks',
    body:
      'Weekly interdisciplinary rounds. Primary clinicians, medical, nursing, BHT, and holistic staff at the same table. Not siloed cases thrown over a wall.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><circle cx="11" cy="12" r="3" /><circle cx="21" cy="12" r="3" /><path d="M5 24c0-3 3-5 6-5s6 2 6 5" /><path d="M15 24c0-3 3-5 6-5s6 2 6 5" /></svg>),
  },
  {
    title: 'Training built into the week',
    body:
      'On-site trainings in the modalities we practice (EMDR, ART, IFS, SE). Professional development is scheduled, not squeezed.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><path d="M4 12l12-6 12 6-12 6z" /><path d="M8 14v6c0 2 4 4 8 4s8-2 8-4v-6" /></svg>),
  },
  {
    title: 'The land does some of the work',
    body:
      'You treat clients at the base of the Swisshelm Mountains on a 160-acre ranch, under a dark sky. The setting is not a perk — it is part of the model.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><path d="M3 24l7-10 5 5 5-7 9 12z" /><circle cx="23" cy="8" r="3" /></svg>),
  },
  {
    title: 'Voice in how we build this',
    body:
      'Boutique census means your case notes, training requests, and protocol suggestions actually shape how we run. Our program is a living thing you help shape.',
    glyph: (<svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true" {...s}><path d="M6 20l4-4 6 6 10-10" /><polyline points="20 2 26 2 26 8" /></svg>),
  },
];

export default function WhyWorkHere() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="why-work-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Why work here</p>
          <h2
            id="why-work-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            A <em className="not-italic text-primary">clinical</em> program disguised as a ranch.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Six reasons clinicians who have worked in larger programs keep
            saying Seven Arrows is the closest they have come to the job they
            trained for.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((p, i) => (
            <article
              key={p.title}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.07}s`,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(216,137,102,0.16) 0%, rgba(107,42,20,0.08) 100%)',
                  color: 'var(--color-primary-dark)',
                }}
                aria-hidden="true"
              >
                {p.glyph}
              </div>
              <h3
                className="text-foreground font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
              >
                {p.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
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
