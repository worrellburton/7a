'use client';

// Landing-page review carousel. Cursor-style pull quotes (big sans-
// serif, curly marks, single muted attribution line) sit over the
// per-slide background video so the section reads as one continuous
// film frame instead of a card.
//
// Controls: click arrows, dot buttons, or use arrow keys. Auto-advances
// every ~9s when not paused (pauses on hover/focus and when the tab is
// hidden).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewBubbleData } from './ReviewBubble';

interface CarouselSlide {
  review: ReviewBubbleData;
  /** Background video for the slide. Optional — slides without one
   *  fall back to the solid dark frame. */
  videoUrl?: string;
}

interface Props {
  slides: CarouselSlide[];
  /** Milliseconds between auto-advances. Set 0 to disable. */
  autoplayMs?: number;
  /**
   * Optional overlay rendered at the top of the carousel, above the
   * quote. Used by the homepage to drop the "Real Stories of Recovery"
   * section title directly onto the frame instead of living in a
   * separate strip above it.
   */
  header?: React.ReactNode;
}

// Hard cap for the displayed quote — longer reviews get clipped on a
// sentence boundary so the slide always fits without dominating the
// viewport. The full review is one click away on Google.
const QUOTE_CAP = 320;

function clipQuote(text: string): { display: string; clipped: boolean } {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= QUOTE_CAP) return { display: cleaned, clipped: false };
  const cut = cleaned.slice(0, QUOTE_CAP);
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (sentenceEnd > 200) return { display: cut.slice(0, sentenceEnd + 1), clipped: true };
  const space = cut.lastIndexOf(' ');
  return { display: (space > 200 ? cut.slice(0, space) : cut) + '…', clipped: true };
}

// Length-scaled sizing — short punchlines get the big poster treatment;
// longer quotes step down to keep the slide composed on one screen.
// Desktop sizes intentionally restrained: past ~180 chars the slide
// starts to dominate the viewport, so lg caps at text-2xl rather than
// the larger sizes used at shorter lengths.
function quoteSizeClass(len: number): string {
  if (len <= 110) return 'text-2xl sm:text-3xl lg:text-[2.5rem]';
  if (len <= 200) return 'text-xl sm:text-2xl lg:text-[2rem]';
  if (len <= 280) return 'text-lg sm:text-xl lg:text-[1.6rem]';
  return 'text-base sm:text-lg lg:text-[1.35rem]';
}

function Chevron({
  direction,
  className = 'w-6 h-6',
}: {
  direction: 'left' | 'right';
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'left' ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export default function ReviewCinemaCarousel({ slides, autoplayMs = 9000, header }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track which video elements have started playing so we can fade
  // them in rather than flashing black before the first frame lands.
  const [readyMap, setReadyMap] = useState<Record<number, boolean>>({});

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [next, prev]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Touch-swipe navigation. Track the starting X on pointerdown, and
  // if the visitor lifts after a >40px horizontal drag (and a modest
  // vertical budget so scrolling the page doesn't trigger a slide
  // change), advance or go back. Auto-advance is suppressed while a
  // swipe is in progress.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (total <= 1) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    setPaused(true);
  }, [total]);
  const onTouchMove = useCallback((_e: React.TouchEvent) => {
    // No-op — we commit on touchEnd so the user can still scroll the
    // page vertically through the carousel area. Kept as a placeholder
    // in case we later want to add drag-follow animation.
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setPaused(false);
    if (!start || total <= 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dy) > 80) return;
    if (dx < 0) next();
    else prev();
  }, [next, prev, total]);

  useEffect(() => {
    if (autoplayMs <= 0 || paused || total <= 1) return;
    const id = window.setTimeout(next, autoplayMs);
    return () => window.clearTimeout(id);
  }, [autoplayMs, paused, next, total, index]);

  if (total === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Client review carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative w-full overflow-hidden bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 touch-pan-y select-none"
      style={{ minHeight: header ? '620px' : '480px' }}
    >
      {/* Subtle radial lift so the quote sits on something softer than
          pure black — still reads as Cursor-style "dark canvas" but
          gives the composition a faint center of gravity. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(60,40,28,0.35) 0%, rgba(0,0,0,0.0) 60%)',
        }}
      />

      {header && (
        <div className="absolute top-0 inset-x-0 z-20 pt-10 lg:pt-14 px-4 sm:px-6 lg:px-8 pointer-events-none">
          {header}
        </div>
      )}

      {/* Stacked slides, cross-fade via opacity. */}
      {slides.map((slide, i) => {
        const isActive = i === index;
        const isReady = readyMap[i];
        const { display } = clipQuote(slide.review.text);
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
            aria-hidden={!isActive}
          >
            {/* Background video (muted/playsInline for autoplay on
                iOS). Preload "auto" for the active + next slide, just
                "metadata" for the rest so we don't pay bandwidth for
                slides the user never sees. */}
            {slide.videoUrl && (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={slide.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                preload={isActive || i === (index + 1) % total ? 'auto' : 'metadata'}
                onCanPlay={() => setReadyMap((m) => (m[i] ? m : { ...m, [i]: true }))}
                style={{ opacity: isReady ? 1 : 0, transition: 'opacity 600ms ease' }}
                aria-hidden="true"
              />
            )}

            {/* Gradient stack — radial vignette + bottom-up dark
                gradient so the quote is always legible regardless of
                what the underlying video looks like. */}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.58) 60%, rgba(0,0,0,0.82) 100%), linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.58) 75%, rgba(0,0,0,0.88) 100%)',
              }}
            />

            <div className="relative z-10 h-full flex items-center justify-center px-6 sm:px-12 lg:px-24 pb-24 pt-40 sm:pt-36 lg:pt-40">
              <div
                className="w-full max-w-4xl text-center text-white"
                style={{
                  transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                  opacity: isActive ? 1 : 0,
                  transition:
                    'opacity 700ms ease 120ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 120ms',
                }}
              >
                <blockquote
                  className={`${quoteSizeClass(display.length)} font-semibold leading-[1.25] tracking-tight text-white`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    textShadow: '0 2px 20px rgba(0,0,0,0.55)',
                  }}
                >
                  <span aria-hidden="true" className="text-white/85">&ldquo;</span>
                  {display}
                  <span aria-hidden="true" className="text-white/85">&rdquo;</span>
                </blockquote>

                <div
                  className="mt-8 inline-flex items-center gap-3 text-sm sm:text-base text-white/55"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {/* Reviewer profile photo (Google Places profile
                      photo when available, initials disc otherwise).
                      Framed in a white ring so it reads against both
                      dark and busy video backgrounds. */}
                  {slide.review.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.review.photoUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/80 shadow-md shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center text-white text-base font-bold ring-2 ring-white/80 shadow-md shrink-0">
                      {(slide.review.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="inline-flex flex-col items-start leading-tight text-left">
                    <span className="text-white/80 font-semibold">{slide.review.name}</span>
                    <span className="text-[11px] sm:text-xs text-white/55">
                      {slide.review.source === 'curated'
                        ? slide.review.date || 'Verified alum review'
                        : `Verified Google review${slide.review.date ? ` · ${slide.review.date}` : ''}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Prev / next arrows. Mobile: pinned to bottom corners so they
          don't overlap the quote. sm+ restores vertical-center sides. */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous review"
            className="absolute bottom-4 left-4 sm:bottom-auto sm:top-1/2 sm:left-8 sm:-translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <Chevron direction="left" className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next review"
            className="absolute bottom-4 right-4 sm:bottom-auto sm:top-1/2 sm:right-8 sm:-translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <Chevron direction="right" className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Slide indicator dots + counter */}
      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2">
            {slides.map((_, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to review ${i + 1}`}
                  aria-current={active ? 'true' : 'false'}
                  className="group h-1.5 rounded-full transition-all"
                  style={{
                    width: active ? '28px' : '6px',
                    background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                  }}
                />
              );
            })}
          </div>
          <span
            className="ml-2 text-white/50 text-xs tabular-nums"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {index + 1} / {total}
          </span>
        </div>
      )}
    </div>
  );
}
