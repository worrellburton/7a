'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 6. Forward-Facing Freedom® three-phase path.
 * Stabilize → Understand → Grow, rendered as three cards on a
 * painted-in rail with numbered markers, in the style of the
 * evidence-based page's phase framework. Dark section for weight.
 */

const phases = [
  {
    n: '01',
    title: 'Stabilize',
    body: 'Regulate the autonomic nervous system through breathwork, somatic awareness, and acute relaxation strategies before engaging in any deeper processing.',
  },
  {
    n: '02',
    title: 'Understand',
    body: 'Develop awareness of internal cues, reframe cravings as nervous-system activation states, and build a coherent narrative of recovery.',
  },
  {
    n: '03',
    title: 'Grow',
    body: 'Cultivate post-traumatic growth through meaning-making, values-driven living, and strengthened relational connection.',
  },
];

export default function ForwardFacingFreedom() {
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
    <section ref={ref} className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden" aria-labelledby="fff-heading">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 55% at 50% 0%, rgba(216,137,102,0.15) 0%, rgba(216,137,102,0) 65%)' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14 lg:mb-20" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>Forward-Facing Freedom<span className="align-super text-[9px]">®</span></p>
          <h2 id="fff-heading" className="font-bold tracking-tight mb-5" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.1rem, 4.2vw, 3.2rem)', lineHeight: 1.03 }}>
            Stabilize. Understand. <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Grow.</em>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            A present-focused model that prioritizes capacity-building over
            retrospective trauma processing. Developed by Dr. J. Eric Gentry
            and Lindsay Rothschild.
          </p>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute left-0 right-0 top-[34px] h-px bg-white/15" aria-hidden="true" />
          <div className="absolute left-0 top-[34px] h-px" aria-hidden="true" style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)', width: visible ? '100%' : '0%', transition: 'width 2.2s cubic-bezier(0.22,1,0.36,1) 0.3s' }} />
          <div className="grid grid-cols-3 gap-6">
            {phases.map((p, i) => (
              <div key={p.n} className="relative pt-20" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.15}s` }}>
                <div className="absolute left-0 top-[14px] w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: 'var(--color-primary)', fontFamily: 'var(--font-body)', boxShadow: '0 0 0 5px rgba(216,137,102,0.2)' }}>
                  {i + 1}
                </div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-2" style={{ fontFamily: 'var(--font-body)' }}>Phase {p.n}</p>
                <h3 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem' }}>{p.title}</h3>
                <p className="text-white/75 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile vertical */}
        <div className="lg:hidden relative pl-9 space-y-10">
          <div className="absolute left-[17px] top-4 bottom-4 w-px bg-white/15" aria-hidden="true" />
          <div className="absolute left-[17px] top-4 w-px" aria-hidden="true" style={{ background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-accent) 100%)', height: visible ? 'calc(100% - 2rem)' : '0%', transition: 'height 2s cubic-bezier(0.22,1,0.36,1) 0.2s' }} />
          {phases.map((p, i) => (
            <article key={p.n} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-8px)', transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.14}s` }}>
              <span className="absolute -left-[30px] top-1 w-9 h-9 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}>{i + 1}</span>
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Phase {p.n}</p>
              <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{p.title}</h3>
              <p className="text-white/75 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
