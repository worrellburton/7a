'use client';

import { useEffect, useRef, useState } from 'react';

interface Pair {
  enabling: string;
  boundary: string;
}

const pairs: Pair[] = [
  {
    enabling: 'Paying off their credit card again',
    boundary: 'Offering to cover the treatment deposit — and only that.',
  },
  {
    enabling: 'Calling in sick to their job for them',
    boundary: 'Letting them make that call themselves, and being present after.',
  },
  {
    enabling: 'Keeping "peace" by not raising the use in conversation',
    boundary: 'Naming what you\'re seeing, once, in a calm tone, and then letting the response land.',
  },
  {
    enabling: 'Waking up to check that they\'re breathing',
    boundary: 'Getting your own sleep and your own therapist.',
  },
  {
    enabling: 'Saying "I\'m fine" when asked',
    boundary: 'Telling someone safe the truth about how you are.',
  },
  {
    enabling: 'Taking on their responsibilities around the house',
    boundary: 'Doing your own and leaving theirs undone, even when it\'s hard to watch.',
  },
];

export default function BoundariesVsEnabling() {
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
      aria-labelledby="boundaries-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Boundaries &amp; enabling</p>
          <h2
            id="boundaries-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            The difference, <em className="not-italic text-primary">in practice</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Neither is a character verdict. Enabling is what love looks like
            before it has been taught what else it can look like. Six
            everyday situations, two ways of being in each.
          </p>
        </div>

        <ul className="space-y-4 lg:space-y-5">
          {pairs.map((p, i) => (
            <li
              key={p.enabling}
              className="grid md:grid-cols-2 gap-4 items-stretch"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div className="rounded-2xl bg-warm-bg border border-black/10 p-6 lg:p-7">
                <p
                  className="text-[10px] font-semibold tracking-[0.28em] uppercase text-foreground/55 mb-3 inline-flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                  </svg>
                  Enabling
                </p>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {p.enabling}
                </p>
              </div>
              <div
                className="rounded-2xl p-6 lg:p-7 text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                }}
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-3 inline-flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Boundary
                </p>
                <p
                  className="text-white/90 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {p.boundary}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
