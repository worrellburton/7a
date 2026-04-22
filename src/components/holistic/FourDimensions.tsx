'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 3. Whole-person intro.
 *
 * Four dimensions of healing, each with a custom SVG glyph, title,
 * and short gloss connecting holistic practice to that dimension.
 * Sits between the Mind/Body/Spirit thesis (phase 2) and the
 * modalities bento (phase 4) — argues that "whole person" means
 * four registers working together, not three, not one.
 */

interface Dimension {
  key: string;
  title: string;
  gloss: string;
  body: string;
  glyph: React.ReactNode;
}

const dimensions: Dimension[] = [
  {
    key: 'physical',
    title: 'Physical',
    gloss: 'The body keeps the score',
    body:
      'Movement, breath, sleep, food. Somatic practice reconnects clients to the body that addiction numbed and trauma fled.',
    glyph: (
      <svg viewBox="0 0 64 64" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="32" cy="16" r="6" />
        <path d="M32 22v20" />
        <path d="M20 28l12 4 12-4" />
        <path d="M32 42l-8 16" />
        <path d="M32 42l8 16" />
      </svg>
    ),
  },
  {
    key: 'emotional',
    title: 'Emotional',
    gloss: 'Feeling, named and moved',
    body:
      'Art, music, sound, and breathwork give shape to what language cannot. Clients learn to feel again without drowning.',
    glyph: (
      <svg viewBox="0 0 64 64" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M32 52C20 44 12 34 12 24a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 10-8 20-20 28z" />
      </svg>
    ),
  },
  {
    key: 'relational',
    title: 'Relational',
    gloss: 'Co-regulation and circle',
    body:
      'Talking circles, group practice, shared ceremony. The nervous system learns safety from other nervous systems.',
    glyph: (
      <svg viewBox="0 0 64 64" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="22" cy="26" r="6" />
        <circle cx="42" cy="26" r="6" />
        <circle cx="32" cy="44" r="6" />
        <path d="M27 30l2 9" />
        <path d="M37 30l-2 9" />
        <path d="M28 26h8" />
      </svg>
    ),
  },
  {
    key: 'spiritual',
    title: 'Spiritual',
    gloss: 'Meaning and the bigger belonging',
    body:
      'Sweat lodge, land-based ceremony, night sky. Practices with lineage that put a life back inside a story larger than itself.',
    glyph: (
      <svg viewBox="0 0 64 64" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M32 8l5 15 16 1-12 11 4 16-13-9-13 9 4-16-12-11 16-1z" />
      </svg>
    ),
  },
];

export default function FourDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="four-dim-heading"
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
          <p className="section-label mb-5">The whole person</p>
          <h2
            id="four-dim-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Four dimensions, <em className="not-italic text-primary">one life</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Recovery that holds isn&rsquo;t a single intervention &mdash;
            it&rsquo;s a set of practices that reach every register a person
            lives in. Our holistic program moves across all four.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {dimensions.map((d, i) => (
            <article
              key={d.key}
              className="relative rounded-2xl bg-white border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(216,137,102,0.14) 0%, rgba(107,42,20,0.08) 100%)',
                  color: 'var(--color-primary-dark)',
                }}
                aria-hidden="true"
              >
                {d.glyph}
              </div>
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary/80 mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {d.gloss}
              </p>
              <h3
                className="text-foreground font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  lineHeight: 1.1,
                }}
              >
                {d.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {d.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
