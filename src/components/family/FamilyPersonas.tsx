'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Persona {
  role: string;
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

const personas: Persona[] = [
  {
    role: 'For parents',
    title: 'Parents of an adult child',
    body: 'The line between helping and enabling, the guilt that shows up at 3am, the fear of the phone call. We work with parents on boundaries, on regulating your own nervous system, and on staying close without absorbing the chaos.',
    glyph: (<svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}><circle cx="11" cy="10" r="3" /><circle cx="21" cy="10" r="3" /><circle cx="16" cy="22" r="3" /><path d="M6 22c0-3 2-5 5-5s5 2 5 5" /><path d="M16 22c0-3 2-5 5-5s5 2 5 5" /></svg>),
  },
  {
    role: 'For partners',
    title: 'Spouses & partners',
    body: 'You\'ve carried more than you should have for longer than you realized. Our work with partners rebuilds trust carefully, at your pace, with room for honest repair and honest grief about the years it cost.',
    glyph: (<svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}><path d="M16 26s-10-6-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14z" /></svg>),
  },
  {
    role: 'For adult children',
    title: 'Adult children of a parent in treatment',
    body: 'A specific kind of heartbreak. We offer structured work for adult children that honors what you watched growing up and gives you a way to stay connected to a parent in recovery without sliding back into old family roles.',
    glyph: (<svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}><circle cx="16" cy="10" r="4" /><path d="M8 26c0-4 3-8 8-8s8 4 8 8" /><path d="M22 4l3 3" /></svg>),
  },
  {
    role: 'For the whole system',
    title: 'Siblings, chosen family, long-term partners',
    body: 'Family is whoever showed up. We extend the same program to siblings, close friends, co-parents, and chosen family. Anyone the client wants involved, within clinical boundaries, can be part of the work.',
    glyph: (<svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}><circle cx="10" cy="13" r="3" /><circle cx="22" cy="13" r="3" /><circle cx="10" cy="23" r="3" /><circle cx="22" cy="23" r="3" /><path d="M13 13h6" /><path d="M13 23h6" /><path d="M10 16v4" /><path d="M22 16v4" /></svg>),
  },
];

export default function FamilyPersonas() {
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
      aria-labelledby="personas-heading"
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
          <p className="section-label mb-5">Who this is for</p>
          <h2
            id="personas-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Everyone has a <em className="not-italic text-primary">specific</em> grief.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The work with a parent is not the work with a partner. Our family
            program is paced and shaped to whoever is doing it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          {personas.map((p, i) => (
            <article
              key={p.title}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="flex items-start gap-5">
                <div
                  className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(216,137,102,0.18) 0%, rgba(107,42,20,0.08) 100%)',
                    color: 'var(--color-primary-dark)',
                  }}
                  aria-hidden="true"
                >
                  {p.glyph}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.role}
                  </p>
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
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
