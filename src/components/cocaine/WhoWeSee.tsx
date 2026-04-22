'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 6. "Who we actually see."
 *
 * Five realistic client archetypes that present for cocaine treatment
 * at Seven Arrows. Breaks the "crack-addict on a park bench"
 * stereotype that keeps high-functioning users out of care. Each
 * card reveals on scroll with a subtle left→right slide.
 */

type Persona = {
  label: string;
  headline: string;
  body: string;
};

const personas: Persona[] = [
  {
    label: 'The high-functioning professional',
    headline: 'A job you still hold.',
    body: 'Weekend binges, then back to the office. Nobody on your team knows. The lie is working — until it isn\'t. Most of our cocaine admissions arrive from this column.',
  },
  {
    label: 'The poly-substance pattern',
    headline: 'Cocaine to go up, alcohol to come down.',
    body: 'Rarely just cocaine. Alcohol, benzodiazepines, or opioids fill the crash on the other side. We treat both sides of the pattern simultaneously.',
  },
  {
    label: 'The ADHD / stimulant self-medicator',
    headline: 'It felt like it made you work.',
    body: 'Cocaine initially felt like focus or energy on days when executive function failed. The nervous-system cost arrived later. Dual-diagnosis care sits at the center of treatment.',
  },
  {
    label: 'The trauma survivor',
    headline: 'Something the body wanted to outrun.',
    body: 'Acute or complex trauma underneath the use. The stimulant was an anaesthetic for a nervous system that never got to come down. Forward-Facing Freedom® is built for exactly this.',
  },
  {
    label: 'The relapse',
    headline: 'Not your first stay.',
    body: 'You\'ve been through treatment before — sometimes more than once. We don\'t count that against you. We look at what was missing last time, and we build that in.',
  },
];

export default function WhoWeSee() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="who-heading"
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
          <p className="section-label mb-5">Who We Actually See</p>
          <h2
            id="who-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Five patterns that walk through our door —{' '}
            <em className="not-italic text-primary">not the one on television</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The cocaine stereotype keeps people out of care. Recognize
            yourself in any of these and know that you are exactly who
            we treat.
          </p>
        </div>

        <ol className="space-y-4 lg:space-y-5">
          {personas.map((p, i) => (
            <li
              key={p.label}
              className="group relative rounded-2xl border border-black/5 bg-warm-bg p-6 lg:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-14px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="grid md:grid-cols-12 gap-4 md:gap-8 items-start">
                <div className="md:col-span-4">
                  <p
                    className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {`Pattern ${String(i + 1).padStart(2, '0')}`}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-0"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                  >
                    {p.label}
                  </h3>
                </div>
                <div className="md:col-span-8">
                  <p
                    className="text-foreground/85 text-[1.05rem] mb-2"
                    style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                  >
                    {p.headline}
                  </p>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
