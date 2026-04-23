'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

// Auto-rotating quote carousel pulled from team members' favorite_quote
// field on the users table. Skips members without a quote so we don't
// render empty slides; renders nothing at all if no one has a quote yet.

interface Props {
  team: PublicTeamMember[];
  /** ms between auto-advance, default 7000 */
  intervalMs?: number;
}

export default function TeamQuoteCarousel({ team, intervalMs = 7000 }: Props) {
  const slides = team.filter((m) => (m.favorite_quote || '').trim().length > 0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

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
      className="bg-white py-20 lg:py-28"
      aria-label="What our team says"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="section-label justify-center mb-5">In their words</p>

        {/* Stage — fixed min-height so the auto-advance doesn't reflow
            the page beneath it. */}
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
                  &ldquo;{m.favorite_quote}&rdquo;
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
        </div>

        {/* Dots — only shown when there's more than one slide. */}
        {slides.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {slides.map((_, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show quote ${i + 1} of ${slides.length}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'w-8 bg-primary' : 'w-1.5 bg-foreground/20 hover:bg-foreground/40'
                  }`}
                />
              );
            })}
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
