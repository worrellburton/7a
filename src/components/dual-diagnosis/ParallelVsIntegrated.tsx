'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 5. Side-by-side comparison of the older
 * parallel-treatment model vs our integrated approach. Left tile is
 * dashed/grayed; right tile is warmed and ticked — same row-by-row
 * traits contrasted.
 */

const rows = [
  { trait: 'Who treats you', parallel: 'Two teams, rarely coordinated', integrated: 'One clinical team, shared plan' },
  { trait: 'When trauma is treated', parallel: 'Deferred until after "stabilization"', integrated: 'Woven in from day one, safely titrated' },
  { trait: 'Medication decisions', parallel: 'Made in isolation from addiction work', integrated: 'Psychiatrist, therapist, and medical coordinate daily' },
  { trait: 'Relapse response', parallel: 'Treated as an addiction failure', integrated: 'Read as a signal from an underlying condition' },
  { trait: 'Discharge plan', parallel: 'Hand-offs between providers', integrated: 'One continuity-of-care plan for both' },
];

export default function ParallelVsIntegrated() {
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
    <section ref={ref} className="py-24 lg:py-32 bg-white" aria-labelledby="vs-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label mb-5">Why Integration Matters</p>
          <h2 id="vs-heading" className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 2.9rem)', lineHeight: 1.03 }}>
            Parallel care leaves people in the middle. <em className="not-italic text-primary">Integrated care holds them.</em>
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-warm-bg">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-4 px-6 py-4 lg:py-5 bg-warm-bg">
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Compared across</p>
            </div>
            <div className="lg:col-span-4 px-6 py-4 lg:py-5 bg-[#2a0f0a]/5 text-foreground">
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/40 mb-1" style={{ fontFamily: 'var(--font-body)' }}>Parallel treatment</p>
              <p className="font-bold text-foreground/80" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Two systems, separately</p>
            </div>
            <div className="lg:col-span-4 px-6 py-4 lg:py-5 text-white" style={{ background: 'linear-gradient(120deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)' }}>
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/70 mb-1" style={{ fontFamily: 'var(--font-body)' }}>Seven Arrows</p>
              <p className="font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Integrated · one clinical team</p>
            </div>
          </div>

          {rows.map((row, i) => (
            <div key={row.trait} className="grid grid-cols-1 lg:grid-cols-12 items-stretch border-t border-black/5" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.07}s` }}>
              <div className="lg:col-span-4 px-6 py-5 bg-white text-foreground font-semibold text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>{row.trait}</div>
              <div className="lg:col-span-4 px-6 py-5 bg-white text-foreground/60 text-[14px] flex items-start gap-3 border-l border-black/5" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-foreground/50" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </span>
                <span>{row.parallel}</span>
              </div>
              <div className="lg:col-span-4 px-6 py-5 bg-white text-foreground/85 text-[14px] flex items-start gap-3 border-l border-black/5" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span>{row.integrated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
