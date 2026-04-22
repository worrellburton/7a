'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dual Diagnosis — Phase 3. Count-up prevalence stats. Four tiles
 * covering co-occurrence rate, adults affected, treated-for-both
 * rate, and outcome improvement with integrated care. White bg.
 */

const stats = [
  { v: 50, suffix: '%', unit: 'co-occurrence', label: 'of adults with a substance use disorder also meet criteria for a co-occurring mental-health condition.' },
  { v: 21.5, suffix: 'M', unit: 'adults', label: 'live with co-occurring mental-health and substance-use disorders in the United States.' },
  { v: 8, suffix: '%', unit: 'receive both', label: 'of those with co-occurring conditions receive treatment for both — the rest are only partially treated.' },
  { v: 3, suffix: '×', unit: 'outcomes', label: 'better sustained-recovery outcomes when the two conditions are treated in an integrated program versus separately.' },
];

export default function PrevalenceStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white" aria-labelledby="prev-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
          <p className="section-label mb-5">Prevalence</p>
          <h2 id="prev-heading" className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.1rem)', lineHeight: 1.03 }}>
            Dual diagnosis is <em className="not-italic text-primary">the rule</em>, not the exception.
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {stats.map((s, i) => (
            <div key={s.label} className="relative lg:border-r lg:border-black/10 lg:last:border-r-0 lg:pr-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s` }}>
              <div className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 4.6vw, 3.8rem)', lineHeight: 1 }}>
                <CountUp to={s.v} active={visible} />
                <span className="text-primary">{s.suffix}</span>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mt-3 mb-2" style={{ fontFamily: 'var(--font-body)' }}>{s.unit}</p>
              <p className="text-foreground/70 text-sm leading-snug max-w-[260px]" style={{ fontFamily: 'var(--font-body)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-[11px] uppercase tracking-[0.22em] text-foreground/45 font-semibold" style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 1s' }}>
          Source · SAMHSA National Survey on Drug Use and Health
        </p>
      </div>
    </section>
  );
}

function CountUp({ to, active, duration = 1500 }: { to: number; active: boolean; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Number((e * to).toFixed(to % 1 === 0 ? 0 : 1)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return <>{to % 1 === 0 ? Math.round(v) : v.toFixed(1)}</>;
}
