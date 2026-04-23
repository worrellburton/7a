'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 5 — "Seven Arrows vs. Traditional Rehab".
 *
 * Side-by-side comparison with animated check / x glyphs that stagger
 * in on scroll. A familiar pattern for buyers in any research-heavy
 * decision (and addiction treatment absolutely is one) — makes the
 * structural difference legible at a glance.
 */

const rows: { trait: string; us: string; them: string }[] = [
  {
    trait: 'Campus size',
    us: '160-acre private ranch, small census',
    them: 'Urban facilities with 100+ beds',
  },
  {
    trait: 'Client-to-staff ratio',
    us: '6:1 — everyone known by name',
    them: '15:1 or higher, rotating case managers',
  },
  {
    trait: 'Trauma-informed primary model',
    us: 'Forward-Facing Freedom® as the spine of care',
    them: 'Trauma deferred until after "stabilization"',
  },
  {
    trait: 'Experiential modalities',
    us: 'Dedicated equine therapy, sweat lodge, land-based ritual',
    them: 'Group therapy + worksheets',
  },
  {
    trait: 'Detox coordination',
    us: 'Partnered detox facilities — warm hand-off into residential care',
    them: 'Clients left to find detox on their own',
  },
  {
    trait: 'Program length',
    us: '30 / 60 / 90+ days tuned to the nervous system',
    them: '28-day fixed, insurance-driven',
  },
  {
    trait: 'Aftercare',
    us: 'Structured step-down + alumni community',
    them: 'Discharge with a PDF',
  },
];

export default function VsTraditional() {
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
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="vs-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-2xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">How We Compare</p>
          <h2
            id="vs-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            Seven Arrows vs. a <em className="not-italic text-primary">traditional rehab</em>.
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-warm-bg">
          {/* Header row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-4 px-6 py-4 lg:py-5 bg-warm-bg">
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Compared across
              </p>
            </div>
            <div
              className="lg:col-span-4 px-6 py-4 lg:py-5 text-white relative"
              style={{
                background:
                  'linear-gradient(120deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/70 mb-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows
              </p>
              <p className="font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                Boutique, trauma-informed, residential
              </p>
            </div>
            <div className="lg:col-span-4 px-6 py-4 lg:py-5 bg-[#2a0f0a]/5 text-foreground">
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40 mb-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Traditional rehab
              </p>
              <p
                className="font-bold text-foreground/80"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}
              >
                Large-census, insurance-driven
              </p>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.trait}
              className="grid grid-cols-1 lg:grid-cols-12 items-stretch border-t border-black/5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.06}s`,
              }}
            >
              <div
                className="lg:col-span-4 px-6 py-5 text-foreground font-semibold text-[14px] bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {row.trait}
              </div>
              <div
                className="lg:col-span-4 px-6 py-5 text-foreground/85 text-[14px] bg-white flex items-start gap-3 border-l border-black/5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>{row.us}</span>
              </div>
              <div
                className="lg:col-span-4 px-6 py-5 text-foreground/60 text-[14px] bg-white flex items-start gap-3 border-l border-black/5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-foreground/50" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span>{row.them}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
