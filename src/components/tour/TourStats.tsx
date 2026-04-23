'use client';

import { useEffect, useRef, useState } from 'react';

/** Tour — Phase 2 stats strip. */

const stats = [
  { value: 160, suffix: '', unit: 'private acres', label: 'at the base of the Swisshelm Mountains' },
  { value: 6, suffix: ':1', unit: 'client-to-staff', label: 'small census, every name known' },
  { value: 12, suffix: '+', unit: 'horses', label: 'on the working ranch, each paired 1:1 with a client' },
  { value: 365, suffix: '', unit: 'desert sunsets', label: 'clear skies and wide-open land, year-round' },
];

export default function TourStats() {
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
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className="bg-white py-16 lg:py-20" aria-label="The ranch by the numbers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="relative lg:border-r lg:border-black/10 lg:last:border-r-0 lg:pr-6"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s`,
              }}
            >
              <div
                className="text-foreground font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 4.6vw, 3.8rem)', lineHeight: 1 }}
              >
                <CountUp to={s.value} active={visible} />
                <span className="text-primary">{s.suffix}</span>
              </div>
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mt-3 mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {s.unit}
              </p>
              <p className="text-foreground/70 text-sm leading-snug max-w-[240px]" style={{ fontFamily: 'var(--font-body)' }}>
                {s.label}
              </p>
            </div>
          ))}
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
      setV(Number((e * to).toFixed(to % 1 === 0 ? 0 : 1)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return <>{to % 1 === 0 ? Math.round(v) : v.toFixed(1)}</>;
}
