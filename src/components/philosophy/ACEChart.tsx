'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Philosophy — Phase 4. ACE study data visualization.
 *
 * Animated bar chart showing the well-established correlation between
 * ACE scores and risk of substance use disorders. Numbers are drawn
 * from the original Felitti/Anda ACE study. Bars paint in on scroll,
 * the headline figure counts up. Editorial prose frames the chart.
 */

const bars = [
  { label: '0 ACEs', multiplier: 1, color: 'rgba(107,42,20,0.25)' },
  { label: '1 ACE',  multiplier: 2, color: 'rgba(107,42,20,0.4)' },
  { label: '2 ACEs', multiplier: 4, color: 'rgba(188,107,74,0.7)' },
  { label: '3 ACEs', multiplier: 7, color: 'rgba(188,107,74,0.9)' },
  { label: '4+ ACEs', multiplier: 10, color: 'var(--color-accent)' },
];

export default function ACEChart() {
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
    <section ref={ref} className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="ace-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}>
            <p className="section-label mb-5">The ACE Study</p>
            <h2 id="ace-heading" className="text-foreground font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.8vw, 2.9rem)', lineHeight: 1.03 }}>
              Early adversity and addiction are <em className="not-italic text-primary">inseparable</em>.
            </h2>
            <div className="space-y-4 text-foreground/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                The landmark Felitti &amp; Anda ACE study established a clear
                relationship between adverse childhood experiences and later
                substance use.
              </p>
              <p>
                Individuals with four or more ACEs face approximately{' '}
                <strong className="text-foreground">10x the risk</strong> of
                illicit drug use compared to those with none. The data demands
                that we treat substance use as a response to trauma, not as an
                isolated behavioral issue.
              </p>
            </div>
            <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-foreground/45 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
              Source · Felitti VJ, Anda RF, et al. (1998)
            </p>
          </div>

          <div className="lg:col-span-7" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(22px)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s' }}>
            <div className="rounded-2xl bg-white p-7 lg:p-10 border border-black/5">
              <div className="flex items-baseline justify-between mb-8">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-2" style={{ fontFamily: 'var(--font-body)' }}>Relative risk of illicit drug use</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 4.2vw, 3.6rem)', lineHeight: 1 }}>
                      <CountUp to={10} active={visible} />×
                    </span>
                    <span className="text-foreground/55 text-sm" style={{ fontFamily: 'var(--font-body)' }}>at 4+ ACEs</span>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/45 mb-1" style={{ fontFamily: 'var(--font-body)' }}>Baseline</p>
                  <p className="text-foreground/70 font-semibold" style={{ fontFamily: 'var(--font-display)' }}>0 ACEs · 1×</p>
                </div>
              </div>

              <ul className="space-y-4">
                {bars.map((b, i) => (
                  <li key={b.label}>
                    <div className="flex items-center justify-between mb-1.5 text-[12px]">
                      <span className="text-foreground/70 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>{b.label}</span>
                      <span className="text-foreground/50 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{b.multiplier}× risk</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden bg-warm-bg">
                      <div className="h-full rounded-full" style={{ background: b.color, width: visible ? `${(b.multiplier / 10) * 100}%` : '0%', transition: `width 1.4s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.15}s` }} />
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-7 text-[12px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
                Normalized so 0 ACEs = 1× baseline. Absolute values vary by
                study; the dose-response pattern is consistent across replications.
              </p>
            </div>
          </div>
        </div>
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
      setV(Number((e * to).toFixed(0)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return <>{Math.round(v)}</>;
}
