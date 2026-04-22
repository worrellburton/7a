'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 5 — living environment gallery.
 *
 * Three full-bleed photo tiles with overlaid captions — shared
 * bedroom, common living room, covered porch. The intent is to
 * reassure: this is a home, not a clinic. Horizontal snap-scroll on
 * mobile, 3-up grid on desktop.
 */

const tiles = [
  {
    image: '/images/bedroom-shared.jpg',
    eyebrow: 'Residences',
    title: 'Home-like shared rooms',
    body: 'Comfortable, considered, and designed to feel nothing like a clinic. Small-census ranch living with real linens, real windows, real rest.',
  },
  {
    image: '/images/common-area-living-room.jpg',
    eyebrow: 'Common Spaces',
    title: 'Rooms to be together in',
    body: 'Warm gathering rooms for community meals, groups, movies, and the quieter conversations that happen on the couch at 9pm.',
  },
  {
    image: '/images/covered-porch-desert-view.jpg',
    eyebrow: 'Outdoors',
    title: 'The porch, the sky, the land',
    body: 'Covered porches, desert views, and 160 acres beyond. The Sonoran landscape itself is therapeutic infrastructure.',
  },
];

export default function LivingEnvironment() {
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
    <section ref={ref} className="py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="living-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 lg:mb-16">
        <div
          className="max-w-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Living Environment</p>
          <h2
            id="living-heading"
            className="text-foreground font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.8vw, 2.9rem)', lineHeight: 1.05 }}
          >
            Not a clinic. <em className="not-italic text-primary">A home.</em>
          </h2>
        </div>
      </div>

      <div className="no-scrollbar flex gap-5 lg:gap-6 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 lg:px-8 pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible max-w-[1400px] mx-auto">
        {tiles.map((t, i) => (
          <figure
            key={t.image}
            className="relative snap-center shrink-0 w-[84vw] sm:w-[60vw] md:w-[44vw] lg:w-auto aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s`,
            }}
          >
            <img
              src={t.image}
              alt={t.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.04]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(10,5,3,0.05) 40%, rgba(10,5,3,0.88) 100%)' }}
            />
            <figcaption className="absolute left-5 right-5 bottom-5 lg:left-6 lg:right-6 lg:bottom-6 text-white">
              <p className="text-[10.5px] uppercase tracking-[0.22em] text-accent font-semibold mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                {t.eyebrow}
              </p>
              <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', lineHeight: 1.12 }}>
                {t.title}
              </h3>
              <p className="text-white/85 text-sm leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                {t.body}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
