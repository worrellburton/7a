'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 3 — "Addiction as a Post-Traumatic Adaptation".
 *
 * Full-bleed portrait photo (`resident-reading-window.jpg`) under a
 * dark plum scrim, with a floating glass-ish card containing the
 * reframe prose. Alongside it, three ACE-study statistics count up
 * from zero when the section scrolls into view.
 */
export default function PostTraumaticAdaptation() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
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

  const stats = [
    { value: 67, suffix: '%', label: 'of adults report at least one Adverse Childhood Experience' },
    { value: 3.1, suffix: 'x', label: 'elevated risk of opioid addiction at four-plus ACEs' },
    { value: 5.0, suffix: 'x', label: 'elevated risk of alcoholism among those with high ACE scores' },
  ];

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      aria-labelledby="adaptation-heading"
    >
      {/* Photo backdrop */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: "url('/images/resident-reading-window.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }}
      />
      {/* Plum scrim */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(115deg, rgba(10,5,3,0.92) 0%, rgba(12,6,4,0.78) 40%, rgba(28,14,8,0.35) 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Reframe card */}
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Reframing Addiction
            </p>
            <h2
              id="adaptation-heading"
              className="text-white font-bold tracking-tight mb-8 max-w-2xl"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.1rem, 3.9vw, 3.1rem)',
                lineHeight: 1.06,
              }}
            >
              Addiction is a <em className="not-italic" style={{ color: 'var(--color-accent)' }}>post-traumatic adaptation</em>, not a moral failure.
            </h2>
            <p
              className="text-white/85 text-lg leading-relaxed mb-5 max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Substance use is a <strong className="text-white">functional adaptation</strong> —
              a way the nervous system regulates overwhelming emotional and
              physiological states. Dissociation, numbing, modulation. It
              worked, until it didn&rsquo;t.
            </p>
            <p
              className="text-white/75 leading-relaxed max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Trauma disrupts interoception, emotional regulation, and autonomic
              functioning. When we recognize addiction as an adaptive capacity
              rather than a character defect, shame loses its hold — and genuine,
              lasting healing becomes possible.
            </p>
          </div>

          {/* ACE stats column */}
          <div className="lg:col-span-5">
            <ul className="flex flex-col gap-5">
              {stats.map((s, i) => (
                <li
                  key={s.label}
                  className="relative pl-5 pr-4 py-5 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(16px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(22px)',
                    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.12}s`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                  <div
                    className="text-white font-bold tracking-tight"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2.2rem, 3.2vw, 2.8rem)',
                      lineHeight: 1,
                    }}
                  >
                    <CountUp to={s.value} active={visible} />
                    <span className="text-accent">{s.suffix}</span>
                  </div>
                  <p
                    className="mt-2 text-sm text-white/70 leading-snug"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.label}
                  </p>
                </li>
              ))}
            </ul>
            <p
              className="mt-5 text-[11px] uppercase tracking-[0.22em] text-white/45"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.8s ease 0.8s',
              }}
            >
              Source · ACE Study (CDC / Kaiser Permanente)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountUp({ to, active, duration = 1400 }: { to: number; active: boolean; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // easeOutQuart
      const e = 1 - Math.pow(1 - p, 4);
      setVal(Number((e * to).toFixed(to % 1 === 0 ? 0 : 1)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, to, duration]);
  return <>{to % 1 === 0 ? Math.round(val) : val.toFixed(1)}</>;
}
