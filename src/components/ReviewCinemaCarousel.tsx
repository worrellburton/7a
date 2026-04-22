'use client';

// Cinematic review carousel — full-bleed video backgrounds with the
// review quote and author overlaid. Each slide cross-fades over the
// next. Click left/right (or use arrow keys, or dot buttons) to cycle.
// Auto-advances every ~9s when not paused (pauses on hover/focus and
// when the tab is hidden).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReviewBubbleData } from './ReviewBubble';

interface CarouselSlide {
  review: ReviewBubbleData;
  videoUrl: string;
}

interface Props {
  slides: CarouselSlide[];
  /** Milliseconds between auto-advances. Set 0 to disable. */
  autoplayMs?: number;
}

// Hard cap for the displayed quote — longer reviews get clipped on a
// sentence boundary so the slide always fits without dominating the
// viewport. The full review is one click away on Google.
const QUOTE_CAP = 320;

function clipQuote(text: string): { display: string; clipped: boolean } {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= QUOTE_CAP) return { display: cleaned, clipped: false };
  const cut = cleaned.slice(0, QUOTE_CAP);
  // Prefer a sentence ending if one is reasonably close to the cap.
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  if (sentenceEnd > 200) return { display: cut.slice(0, sentenceEnd + 1), clipped: true };
  const space = cut.lastIndexOf(' ');
  return { display: (space > 200 ? cut.slice(0, space) : cut) + '…', clipped: true };
}

// Length-scaled font size — short cinematic punchlines get the big
// poster treatment; long reviews step down so the slide composes
// cleanly without overflowing.
function quoteSizeClass(len: number): string {
  if (len <= 110) return 'text-2xl sm:text-3xl lg:text-4xl';
  if (len <= 200) return 'text-xl sm:text-2xl lg:text-3xl';
  if (len <= 280) return 'text-lg sm:text-xl lg:text-2xl';
  return 'text-base sm:text-lg lg:text-xl';
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 drop-shadow' : 'text-white/20'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
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

export default function ReviewCinemaCarousel({ slides, autoplayMs = 9000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track which video elements have actually started playing so we
  // don't show a black flash before the first frame paints.
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

  // Keyboard nav when the carousel is in viewport-focus.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Pause autoplay when the tab is hidden so we don't burn frames in
  // the background.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Autoplay timer.
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
      className="relative w-full overflow-hidden bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{ aspectRatio: '16 / 9', minHeight: '520px' }}
    >
      {/* Slides (stacked, cross-fade via opacity) */}
      {slides.map((slide, i) => {
        const isActive = i === index;
        const isReady = readyMap[i];
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
            {/* Background video. Muted+playsInline for autoplay on
                iOS Safari. preload metadata only so we don't pay
                bandwidth for slides the user never sees. */}
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={slide.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              preload={isActive || i === (index + 1) % total ? 'auto' : 'metadata'}
              onCanPlay={() => setReadyMap((m) => (m[i] ? m : { ...m, [i]: true }))}
              style={{
                opacity: isReady ? 1 : 0,
                transition: 'opacity 600ms ease',
              }}
              aria-hidden="true"
            />

            {/* Gradient stack — radial vignette + bottom-up dark
                gradient so the quote is always legible regardless of
                what the underlying video looks like. */}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.78) 100%), linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
              }}
            />

            {/* Quote overlay */}
            <div className="relative z-10 h-full flex items-center justify-center px-6 sm:px-12 lg:px-24 py-10">
              <div
                className="max-w-2xl text-center text-white"
                style={{
                  transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                  opacity: isActive ? 1 : 0,
                  transition:
                    'opacity 700ms ease 120ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 120ms',
                }}
              >
                <div className="flex justify-center mb-5">
                  <Stars rating={slide.review.rating} />
                </div>

                <svg
                  className="mx-auto mb-3 w-8 h-8 text-white/40"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7.17 6A5.17 5.17 0 002 11.17V18h6v-6.83H4.83A2.34 2.34 0 017.17 9V6zm10 0A5.17 5.17 0 0012 11.17V18h6v-6.83h-3.17A2.34 2.34 0 0117.17 9V6z" />
                </svg>

                {(() => {
                  const { display, clipped } = clipQuote(slide.review.text);
                  return (
                    <>
                      <p
                        className={`${quoteSizeClass(display.length)} leading-snug font-light text-white/95`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {display}
                      </p>
                      {clipped && (
                        <a
                          href="https://maps.google.com/?cid=4853411833030648789"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-xs text-white/50 hover:text-white/80 underline decoration-white/30 hover:decoration-white/60 transition-colors"
                          style={{ fontFamily: 'var(--font-body)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Read full review on Google
                        </a>
                      )}
                    </>
                  );
                })()}

                <div className="mt-7 flex flex-col items-center gap-1.5">
                  <p
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    {slide.review.name}
                  </p>
                  <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm">
                    <GoogleIcon className="w-4 h-4" />
                    <span style={{ fontFamily: 'var(--font-body)' }}>
                      Verified Google review · {slide.review.date}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Prev / next arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous review"
            className="absolute top-1/2 left-4 sm:left-8 -translate-y-1/2 z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <Chevron direction="left" className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next review"
            className="absolute top-1/2 right-4 sm:right-8 -translate-y-1/2 z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <Chevron direction="right" className="w-6 h-6 sm:w-7 sm:h-7" />
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
                  className="group h-2 rounded-full transition-all"
                  style={{
                    width: active ? '32px' : '8px',
                    background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                  }}
                />
              );
            })}
          </div>
          <span
            className="ml-2 text-white/70 text-xs tabular-nums"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {index + 1} / {total}
          </span>
        </div>
      )}
    </div>
  );
}
