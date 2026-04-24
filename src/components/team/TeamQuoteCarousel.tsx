'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

// Auto-rotating quote carousel pulled from team members' favorite_quote
// field on the users table. Skips members without a quote so we don't
// render empty slides; renders nothing at all if no one has a quote yet.

interface Props {
  team: PublicTeamMember[];
  /** ms between auto-advance, default 7000 */
  intervalMs?: number;
}

// Some team members submit their favorite quote with surrounding
// quotation marks already in the string ("To me, recovery..."). We
// render our own &ldquo;/&rdquo; pair, so strip any leading/trailing
// quote characters to avoid showing doubled quotes.
function stripOuterQuotes(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’«»]+/, '')
    .replace(/["'“”‘’«»]+$/, '')
    .trim();
}

export default function TeamQuoteCarousel({ team, intervalMs = 7000 }: Props) {
  const slides = team.filter((m) => (m.favorite_quote || '').trim().length > 0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const total = slides.length;

  const go = useCallback((next: number) => {
    if (total === 0) return;
    setIndex(((next % total) + total) % total);
  }, [total]);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Arrow-key navigation while the carousel is focused / in view.
  useEffect(() => {
    if (total < 2) return;
    const node = ref.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [next, prev, total]);

  // Auto-advance only while in view + not paused + reduced-motion off.
  useEffect(() => {
    if (slides.length < 2 || paused || !inView) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [slides.length, paused, inView, intervalMs]);

  if (slides.length === 0) return null;

  const current = slides[index];

  return (
    <section
      ref={ref}
      tabIndex={0}
      className="bg-white py-20 lg:py-28 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="What our team says"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="section-label justify-center mb-5">In their words</p>

        {/* Stage — fixed min-height so the auto-advance doesn't reflow
            the page beneath it. Flanked by prev/next arrows on sm+
            screens; mobile puts them below the dots. */}
        <div className="relative min-h-[260px] sm:min-h-[220px] flex flex-col items-center justify-center">
          {slides.map((m, i) => {
            const active = i === index;
            return (
              <figure
                key={m.id}
                className="absolute inset-0 flex flex-col items-center justify-center px-2 transition-all duration-700 ease-out"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(8px)',
                  pointerEvents: active ? 'auto' : 'none',
                }}
                aria-hidden={!active}
              >
                <svg
                  className="w-7 h-7 text-primary/30 mb-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9.17 6C7 7.83 6 10 6 12.5V18h6v-6H9c0-2 1-4 3-5l-2.83-1zM18.17 6C16 7.83 15 10 15 12.5V18h6v-6h-3c0-2 1-4 3-5l-2.83-1z" />
                </svg>
                <blockquote
                  className="text-foreground leading-snug italic max-w-2xl"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.3rem, 2.4vw, 1.8rem)',
                    lineHeight: 1.3,
                  }}
                >
                  &ldquo;{stripOuterQuotes(m.favorite_quote || '')}&rdquo;
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-warm-bg flex items-center justify-center text-sm font-bold text-foreground/60">
                      {(m.full_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                      {m.full_name}
                    </p>
                    {m.job_title && (
                      <p
                        className="text-[10px] tracking-[0.18em] uppercase font-semibold text-foreground/50"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {m.job_title}
                      </p>
                    )}
                  </div>
                </figcaption>
              </figure>
            );
          })}

          {/* Prev / next arrow buttons — sm+ flanking the stage. */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous quote"
                className="hidden sm:inline-flex absolute left-0 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white border border-black/10 text-foreground/70 shadow-sm hover:text-primary hover:border-primary/40 hover:shadow transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next quote"
                className="hidden sm:inline-flex absolute right-0 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white border border-black/10 text-foreground/70 shadow-sm hover:text-primary hover:border-primary/40 hover:shadow transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Controls row — dots + mobile prev/next. */}
        {total > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous quote"
              className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-black/10 text-foreground/70 shadow-sm hover:text-primary hover:border-primary/40 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => {
                const active = i === index;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show quote ${i + 1} of ${slides.length}`}
                    aria-current={active ? 'true' : 'false'}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active ? 'w-8 bg-primary' : 'w-1.5 bg-foreground/20 hover:bg-foreground/40'
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next quote"
              className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-black/10 text-foreground/70 shadow-sm hover:text-primary hover:border-primary/40 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {current && (
          <span className="sr-only" aria-live="polite">
            Quote from {current.full_name}: {current.favorite_quote}
          </span>
        )}
      </div>
    </section>
  );
}
