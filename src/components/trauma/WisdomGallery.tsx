'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 5 — Wisdom-quote gallery.
 *
 * Four full-bleed photo tiles in a snap-scroll horizontal rail (each
 * tile is ~84vw on mobile, fitting the rail cleanly). Desktop widens
 * to a four-up grid. Quote typography sits over a scrim at the bottom
 * of each photo; each tile eases in on viewport intersection with a
 * slight stagger.
 */

type Tile = {
  image: string;
  alt: string;
  quote: string;
  attribution: string;
};

const tiles: Tile[] = [
  {
    image: '/images/campfire-ceremony-circle.webp',
    alt: 'Ceremony circle gathered around an evening campfire.',
    quote:
      'Trauma healed in isolation becomes trauma repeated. Healed in community, it becomes wisdom.',
    attribution: 'On community as medicine',
  },
  {
    image: '/images/horses-grazing.jpg',
    alt: 'Horses grazing under open desert sky at Seven Arrows.',
    quote:
      'Horses mirror what words cannot — they feel the body’s truth before the mind catches up to it.',
    attribution: 'On equine-assisted work',
  },
  {
    image: '/images/sound-healing-session.jpg',
    alt: 'Sound healing session with singing bowls and soft light.',
    quote:
      'The nervous system listens to rhythm long before it listens to reason.',
    attribution: 'On somatic practice',
  },
  {
    image: '/images/sign-night-sky-milky-way.jpg',
    alt: 'Seven Arrows sign under a clear Milky Way desert sky.',
    quote:
      'The opposite of addiction is not sobriety. It is connection.',
    attribution: 'Johann Hari',
  },
];

export default function WisdomGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
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
    <section
      ref={ref}
      className="relative py-24 lg:py-28 bg-white overflow-hidden"
      aria-label="Wisdom on trauma and recovery"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 lg:mb-16">
        <div
          className="max-w-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Wisdom From the Work</p>
          <h2
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)',
              lineHeight: 1.08,
            }}
          >
            What trauma-informed recovery sounds like, in four frames.
          </h2>
        </div>
      </div>

      {/* Horizontal rail on mobile/tablet, 4-up grid on lg+. */}
      <div
        className="no-scrollbar flex gap-5 lg:gap-6 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 lg:px-8 pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible max-w-[1400px] mx-auto"
      >
        {tiles.map((t, i) => (
          <figure
            key={t.image}
            className="relative snap-center shrink-0 w-[82vw] sm:w-[60vw] md:w-[44vw] lg:w-auto aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s`,
            }}
          >
            <img
              src={t.image}
              alt={t.alt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.04]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(12,6,4,0.1) 0%, rgba(12,6,4,0.15) 45%, rgba(12,6,4,0.82) 100%)',
              }}
            />
            <figcaption className="absolute left-5 right-5 bottom-5 lg:left-6 lg:right-6 lg:bottom-6">
              <blockquote
                className="text-white leading-[1.32]"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.05rem, 1.35vw, 1.25rem)',
                }}
              >
                <span
                  className="text-accent mr-1"
                  style={{ fontSize: '1.6em', lineHeight: 0 }}
                >
                  “
                </span>
                {t.quote}
              </blockquote>
              <p
                className="mt-3 text-[10.5px] uppercase tracking-[0.22em] text-accent font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t.attribution}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
