'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 8 — Post-Traumatic Growth.
 *
 * Full-bleed parallax photo backdrop (group-sunset-desert), deep scrim
 * so white type reads, three animated number counters describing what
 * "beyond symptom reduction" looks like quantitatively: resilience,
 * program completion, alumni still sober at 12 months. Numbers count
 * up from zero when the section enters the viewport.
 */

export default function PostTraumaticGrowth() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [parY, setParY] = useState(0);

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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Drift the photo a little as the section scrolls past center.
      const progress = (window.innerHeight / 2 - rect.top) / window.innerHeight;
      setParY(progress * 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const stats = [
    { value: 93, suffix: '%', label: 'of clients complete our 90-day residential program' },
    { value: 78, suffix: '%', label: 'report sustained sobriety at the 12-month alumni check-in' },
    { value: 4.9, suffix: '/5', label: 'Google rating across verified alumni & family reviews' },
  ];

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-40 text-white overflow-hidden"
      aria-labelledby="ptg-heading"
    >
      {/* Parallax photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: "url('/images/group-sunset-desert.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: `center calc(50% + ${parY}px)`,
          transition: 'background-position 0.1s linear',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,4,3,0.4) 0%, rgba(8,4,3,0.55) 35%, rgba(8,4,3,0.85) 100%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          Beyond Recovery
        </p>
        <h2
          id="ptg-heading"
          className="font-bold tracking-tight mb-7 mx-auto max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.3rem, 4.5vw, 3.6rem)',
            lineHeight: 1.05,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          From surviving to <em className="not-italic" style={{ color: 'var(--color-accent)' }}>thriving</em>.
        </h2>
        <p
          className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-16"
          style={{
            fontFamily: 'var(--font-body)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.9s ease 0.35s',
          }}
        >
          Forward-Facing Freedom does not stop at symptom reduction. The model
          actively supports post-traumatic growth — increased resilience, deeper
          meaning, and strengthened relational connection. A paradigm shift from
          managing illness to actively creating health.
        </p>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-14 max-w-4xl mx-auto">
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.45 + i * 0.15}s`,
              }}
            >
              <div
                className="font-bold tracking-tight text-white mb-3"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(3rem, 5.5vw, 4.5rem)',
                  lineHeight: 1,
                }}
              >
                <CountUp to={s.value} active={visible} />
                <span className="text-accent">{s.suffix}</span>
              </div>
              <p className="text-white/70 leading-snug text-sm max-w-[280px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ to, active, duration = 1600 }: { to: number; active: boolean; duration?: number }) {
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
