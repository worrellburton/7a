'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 6. Four-stop timeline of a day on the ranch:
 * sunrise, midday, golden hour, night. Each stop has a big photo,
 * a time chip, and short prose. A subtle animated sun-arc SVG sits
 * above the stops and paints in on scroll-in.
 */

const stops = [
  {
    time: '5:45 AM',
    chip: 'Sunrise',
    title: 'The sky starts to turn',
    body: 'Mindfulness on the porch before the rest of the ranch wakes up. Birds, wind, coffee.',
    image: '/images/covered-porch-desert-view.jpg',
  },
  {
    time: '11:30 AM',
    chip: 'Midday',
    title: 'Session, then the arena',
    body: 'Individual therapy and evidence-based groups in the morning, then out to the horses before lunch.',
    image: '/images/equine-therapy-portrait.jpg',
  },
  {
    time: '6:15 PM',
    chip: 'Golden hour',
    title: 'Everything goes amber',
    body: 'The community gathers in the pavilion for dinner as the mountains catch the last of the light.',
    image: '/images/group-gathering-pavilion.jpg',
  },
  {
    time: '10:42 PM',
    chip: 'Under the stars',
    title: 'The Milky Way returns',
    body: 'No city light for miles. The ranch sits under an International Dark-Sky-class horizon every single night.',
    image: '/images/sign-night-sky-milky-way.jpg',
  },
];

export default function DayOnTheRanch() {
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-warm-bg overflow-hidden" aria-labelledby="day-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">A Day on the Ranch</p>
          <h2
            id="day-heading"
            className="text-foreground font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 4.2vw, 3.3rem)', lineHeight: 1.03 }}
          >
            From first light to <em className="not-italic text-primary">Milky Way</em>.
          </h2>
        </div>

        {/* Sun arc, desktop only */}
        <div className="relative hidden lg:block mb-10">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-24 pointer-events-none" aria-hidden="true">
            <defs>
              <linearGradient id="dayArc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
                <stop offset="25%" stopColor="var(--color-accent)" stopOpacity="0.95" />
                <stop offset="75%" stopColor="var(--color-primary)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--color-dark-section)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M 20 100 Q 600 -30 1180 100"
              fill="none"
              stroke="url(#dayArc)"
              strokeWidth="1.25"
              strokeDasharray="1600"
              strokeDashoffset={visible ? 0 : 1600}
              style={{ transition: 'stroke-dashoffset 2.6s cubic-bezier(0.22,1,0.36,1) 0.3s' }}
            />
            {[0.1, 0.38, 0.66, 0.92].map((t, i) => {
              const x = 20 + t * 1160;
              const y = 100 - 130 * (4 * t * (1 - t));
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="5"
                  fill={i === 3 ? 'var(--color-dark-section)' : 'var(--color-accent)'}
                  style={{ opacity: visible ? 1 : 0, transition: `opacity 0.4s ease ${1.5 + i * 0.18}s` }}
                />
              );
            })}
          </svg>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {stops.map((s, i) => (
            <article
              key={s.chip}
              className="rounded-2xl bg-white overflow-hidden border border-black/5 group"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.12}s`,
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span
                    className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {s.chip}
                  </span>
                  <span className="text-[11px] text-foreground/45 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                    {s.time}
                  </span>
                </div>
                <h3
                  className="text-foreground font-bold mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.15 }}
                >
                  {s.title}
                </h3>
                <p className="text-foreground/70 text-[14.5px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
