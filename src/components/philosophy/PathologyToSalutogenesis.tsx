'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 2. "From pathology to salutogenesis."
 *
 * Two-panel editorial with a split-screen animation: left panel is
 * the old pathology model (crossed-out "fix the problem"), right is
 * the salutogenic reframe (create health). A central arrow reveals on
 * scroll. Credits Antonovsky for Sense of Coherence.
 */
export default function PathologyToSalutogenesis() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="salutogenesis-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label mb-5">The Paradigm Shift</p>
          <h2 id="salutogenesis-heading" className="text-foreground font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.1rem)', lineHeight: 1.02 }}>
            From pathology to <em className="not-italic text-primary">health creation</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Our approach draws from <strong className="text-foreground">salutogenesis</strong>&mdash; a
            paradigm introduced by Aaron Antonovsky that shifts focus from
            what makes people sick to what actively creates health.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-4 items-stretch">
          {/* Pathology panel */}
          <div className="rounded-2xl p-8 lg:p-10 border border-black/5 bg-warm-bg relative overflow-hidden" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-18px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s' }}>
            <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-foreground/45 mb-4" style={{ fontFamily: 'var(--font-body)' }}>The old model</p>
            <h3 className="text-foreground/80 font-bold mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.12 }}>
              Pathogenesis
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-6 text-[15px]" style={{ fontFamily: 'var(--font-body)' }}>
              What makes people sick? Treat the disease. Identify the deficit. Reduce symptoms.
            </p>
            <ul className="space-y-2 text-[14px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
              {['Symptom reduction', 'Disease categorization', 'Deficit-focused', 'Risk mitigation'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-foreground/35" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  <span className="line-through decoration-foreground/25">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Center arrow */}
          <div className="hidden lg:flex flex-col items-center justify-center" aria-hidden="true">
            <svg width="80" height="24" viewBox="0 0 80 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="12" x2="72" y2="12" strokeDasharray="80" strokeDashoffset={visible ? 0 : 80} style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) 0.8s' }} />
              <polyline points="62,4 72,12 62,20" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease 2.1s' }} />
            </svg>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mt-3" style={{ fontFamily: 'var(--font-body)' }}>Reframe</p>
          </div>

          {/* Salutogenesis panel */}
          <div className="rounded-2xl p-8 lg:p-10 relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)', opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(18px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s' }}>
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 55% at 85% 15%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 65%)' }} />
            <div className="relative">
              <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-4" style={{ fontFamily: 'var(--font-body)' }}>Our model</p>
              <h3 className="font-bold mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.12 }}>
                Salutogenesis
              </h3>
              <p className="text-white/85 leading-relaxed mb-6 text-[15px]" style={{ fontFamily: 'var(--font-body)' }}>
                What actively creates health? Build resources. Strengthen
                resilience. Cultivate a Sense of Coherence.
              </p>
              <ul className="space-y-2 text-[14px] text-white/90" style={{ fontFamily: 'var(--font-body)' }}>
                {['Health creation', 'Resource-building', 'Resilience-informed', 'Meaning-making'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 text-[12px] uppercase tracking-[0.22em] text-foreground/45 font-semibold text-center" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 1s ease 1.3s' }}>
          Framework · Aaron Antonovsky, PhD
        </p>
      </div>
    </section>
  );
}
