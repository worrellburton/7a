'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Homepage — "Our campus, from every angle."
 *
 * Replaces the old marquee ticker with a dynamic split:
 *   - Left: a full-height sticky-feel looping video column (the
 *     ranchLife clip). Takes the full vertical height of the
 *     section so the video reads as a window into the land.
 *   - Right: an asymmetric 5-tile bento with varied aspect ratios
 *     (one big hero tile + four smaller tiles in mixed sizes)
 *     that reveal on scroll with a staggered transition.
 *
 * Whole section links into /tour via the bottom CTA and the
 * caption tile itself.
 */

interface Tile {
  src: string;
  alt: string;
  caption: string;
  /** Grid span classes that only apply at the `lg` breakpoint and up.
   *  Below `lg` the tiles render as an overflow-x snap scroller, so
   *  grid spans would be no-ops; we prefix every class with `lg:` to
   *  make that explicit instead of relying on absence-of-grid-parent. */
  lgSpan: string;
}

const tiles: Tile[] = [
  {
    src: '/images/facility-exterior-mountains.jpg',
    alt: 'Main residence at the base of the Swisshelm Mountains',
    caption: 'The ranch at first light',
    lgSpan: 'lg:col-span-4 lg:row-span-2',
  },
  {
    src: '/images/horses-grazing.jpg',
    alt: 'The resident herd grazing on the ranch',
    caption: 'The herd',
    lgSpan: 'lg:col-span-2 lg:row-span-2',
  },
  {
    src: '/images/sound-healing-session.jpg',
    alt: 'Sound healing session',
    caption: 'Sound · breath · body',
    lgSpan: 'lg:col-span-2 lg:row-span-2',
  },
  {
    src: '/images/campfire-ceremony-circle.webp',
    alt: 'Ceremony circle under dusk',
    caption: 'Ceremony · dusk',
    lgSpan: 'lg:col-span-2 lg:row-span-2',
  },
  {
    src: '/images/sign-night-sky-milky-way.jpg',
    alt: 'Seven Arrows sign beneath the Milky Way',
    caption: 'Dark-sky preserve',
    lgSpan: 'lg:col-span-2 lg:row-span-2',
  },
];

export default function CampusTour() {
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
      className="relative bg-white overflow-hidden"
      aria-labelledby="campus-heading"
    >
      {/* Header strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-28 pb-10 lg:pb-14">
        <div className="max-w-3xl">
          <p
            className="section-label mb-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            The campus
          </p>
          <h2
            id="campus-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            160 acres at the base of the <em className="not-italic text-primary">Swisshelm Mountains</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed max-w-2xl"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.9s ease 0.35s',
            }}
          >
            Residences, arena, ceremony space, clinical building, dark sky.
            A real glimpse below &mdash; the full cinematic tour lives on
            its own page.
          </p>
        </div>
      </div>

      {/* Split: left column sticky-feel video, right column bento */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-12 gap-4 lg:gap-5 min-h-[calc(100vh-12rem)]">
          {/* Video column — tall, takes the full vertical height of the
              section on desktop. On mobile it becomes a full-width
              hero tile above the bento. */}
          <div
            className="lg:col-span-5 relative rounded-2xl overflow-hidden bg-dark-section aspect-[3/4] lg:aspect-auto group"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            {/* Static establishing shot — the video that used to live
                here (siteVideos.ranchLife) opened on a tight dog
                close-up frame on the landing, which read as a
                visual glitch. Keep the same framing using the
                former poster image so the campus hero reads clean. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/facility-exterior-mountains.jpg"
              alt="Main residence at the base of the Swisshelm Mountains"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(12,6,4,0.15) 0%, rgba(12,6,4,0) 30%, rgba(12,6,4,0.35) 70%, rgba(12,6,4,0.85) 100%)',
              }}
            />
            <Link
              href="/tour"
              className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8 text-white"
              aria-label="Take the full campus tour"
            >
              <p
                className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Full tour · 10 phases
              </p>
              <h3
                className="font-bold mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.75rem, 2.6vw, 2.3rem)',
                  lineHeight: 1.08,
                }}
              >
                Step inside the ranch.
              </h3>
              <span
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-semibold text-white group-hover:gap-3 transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Take the tour
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>

          {/* Bento column.
              - Mobile: a horizontal snap-scroll row of portrait tiles.
                The row escapes the section's px-4/6 padding so tiles
                reach the edges (cleaner scroll-away), and a right-edge
                fade mask hints at the off-screen tiles until the user
                scrolls.
              - lg and up: reverts to the 6-col × 4-row bento grid
                with the original varied spans. */}
          <div
            className="relative lg:col-span-7"
            style={{
              // Right-edge fade mask that only applies on mobile —
              // soft visual nudge that there's more off-screen.
              // Removed at lg via the explicit WebkitMask reset on
              // the inner container rather than CSS @media to stay
              // Tailwind-free for the mask property.
            }}
          >
            <div
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 -mx-4 pb-2 -mt-1 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-none lg:grid lg:grid-cols-6 lg:grid-rows-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:-mx-0 lg:pb-0 lg:min-h-[720px] lg:[-webkit-mask-image:none] lg:[mask-image:none]"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, #000 0, #000 calc(100% - 36px), rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(to right, #000 0, #000 calc(100% - 36px), rgba(0,0,0,0) 100%)',
              }}
            >
              {tiles.map((t, i) => (
                <Link
                  key={t.src}
                  href="/tour"
                  aria-label={`Tour campus · ${t.caption}`}
                  className={`relative group overflow-hidden rounded-2xl bg-dark-section shrink-0 w-[78vw] max-w-[320px] aspect-[4/5] snap-start lg:shrink lg:w-auto lg:max-w-none lg:aspect-auto ${t.lgSpan}`}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(20px)',
                    transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s`,
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
                        'linear-gradient(180deg, rgba(10,5,3,0) 45%, rgba(10,5,3,0.55) 75%, rgba(10,5,3,0.9) 100%)',
                    }}
                  />
                  <figcaption
                    className="absolute inset-x-4 bottom-4 text-white text-[11px] tracking-[0.16em] uppercase font-semibold opacity-90 group-hover:opacity-100 transition-opacity"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.caption}
                  </figcaption>
                </Link>
              ))}
              {/* Trailing spacer so the last tile can snap-center
                  past the fade gutter on mobile. Invisible + no-op
                  at lg since the grid has a fixed count of cells. */}
              <div aria-hidden="true" className="shrink-0 w-1 lg:hidden" />
            </div>

            {/* "swipe" hint pill — tucks bottom-right on mobile only
                and fades after the user begins scrolling. Keeps the
                "there's more" affordance from being purely a mask. */}
            <div
              aria-hidden="true"
              className="lg:hidden pointer-events-none absolute right-4 -bottom-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/55"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.9s ease 1s',
              }}
            >
              <span>Swipe</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-12 lg:mt-16 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.85s',
          }}
        >
          <Link
            href="/tour"
            className="inline-flex items-center gap-2 border-2 border-foreground hover:bg-foreground hover:text-white text-foreground rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Take the full campus tour
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
