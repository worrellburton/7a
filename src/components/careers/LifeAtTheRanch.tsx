'use client';

import { useEffect, useRef, useState } from 'react';

interface Tile {
  src: string;
  alt: string;
  caption: string;
  span: string;
}

const tiles: Tile[] = [
  {
    src: '/images/facility-exterior-mountains.jpg',
    alt: 'Seven Arrows facility exterior with the Swisshelm Mountains behind',
    caption: '160 acres at the base of the Swisshelms',
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    src: '/images/group-therapy-room.jpg',
    alt: 'Group therapy room with natural light',
    caption: 'Small groups, real depth',
    span: '',
  },
  {
    src: '/images/horses-grazing.jpg',
    alt: 'Ranch horses grazing at Seven Arrows',
    caption: 'A resident herd, always on campus',
    span: '',
  },
  {
    src: '/images/covered-porch-desert-view.jpg',
    alt: 'Covered porch at Seven Arrows overlooking the desert',
    caption: 'Where a lot of the best conversations happen',
    span: '',
  },
  {
    src: '/images/sign-night-sky-milky-way.jpg',
    alt: 'Seven Arrows sign under a Milky Way night sky',
    caption: 'A dark-sky preserve out the back door',
    span: 'lg:col-span-2',
  },
];

export default function LifeAtTheRanch() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="life-at-ranch-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Life at the ranch</p>
          <h2
            id="life-at-ranch-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Your <em className="not-italic text-primary">commute</em>, reconsidered.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            A rough sense of where you&rsquo;ll spend your workdays. Full
            campus tour available as part of the interview process.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 auto-rows-[180px] sm:auto-rows-[240px] lg:auto-rows-[220px]">
          {tiles.map((t, i) => (
            <figure
              key={t.src}
              className={`relative overflow-hidden rounded-2xl bg-dark-section group ${t.span}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.src}
                alt={t.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.05]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,5,3,0) 40%, rgba(10,5,3,0.55) 75%, rgba(10,5,3,0.92) 100%)',
                }}
              />
              <figcaption
                className="absolute inset-x-4 bottom-4 text-white text-[12px] tracking-[0.16em] uppercase font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
