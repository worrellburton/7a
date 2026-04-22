'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 2. "Why holistic matters."
 *
 * Editorial two-column: an interlocking Mind/Body/Spirit glyph on
 * the left (hand-drawn SVG, three overlapping circles that reveal in
 * sequence on scroll), paired with the thesis prose on the right.
 * The argument: cognitive-only treatment leaves the body out, and
 * the body is where trauma lives.
 */
export default function WhyHolistic() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="why-holistic-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 15% 30%, rgba(216,137,102,0.09) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Glyph */}
          <div
            className="lg:col-span-5 order-2 lg:order-1"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.96)',
              transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <div className="relative w-full max-w-md mx-auto aspect-square">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
                aria-hidden="true"
                role="img"
              >
                <defs>
                  <radialGradient id="mindFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(216,137,102,0.18)" />
                    <stop offset="100%" stopColor="rgba(216,137,102,0)" />
                  </radialGradient>
                  <radialGradient id="bodyFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(188,107,74,0.18)" />
                    <stop offset="100%" stopColor="rgba(188,107,74,0)" />
                  </radialGradient>
                  <radialGradient id="spiritFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(107,42,20,0.22)" />
                    <stop offset="100%" stopColor="rgba(107,42,20,0)" />
                  </radialGradient>
                </defs>

                {/* Mind (top) */}
                <g
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(-12px)',
                    transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
                    transformOrigin: 'center',
                  }}
                >
                  <circle cx="200" cy="145" r="100" fill="url(#mindFill)" />
                  <circle cx="200" cy="145" r="100" fill="none" stroke="rgba(107,42,20,0.7)" strokeWidth="1.5" />
                </g>

                {/* Body (bottom-left) */}
                <g
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translate(0,0)' : 'translate(-10px,10px)',
                    transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.5s',
                    transformOrigin: 'center',
                  }}
                >
                  <circle cx="145" cy="240" r="100" fill="url(#bodyFill)" />
                  <circle cx="145" cy="240" r="100" fill="none" stroke="rgba(107,42,20,0.7)" strokeWidth="1.5" />
                </g>

                {/* Spirit (bottom-right) */}
                <g
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translate(0,0)' : 'translate(10px,10px)',
                    transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.7s',
                    transformOrigin: 'center',
                  }}
                >
                  <circle cx="255" cy="240" r="100" fill="url(#spiritFill)" />
                  <circle cx="255" cy="240" r="100" fill="none" stroke="rgba(107,42,20,0.7)" strokeWidth="1.5" />
                </g>

                {/* Labels */}
                <g
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.9s ease 1s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <text x="200" y="75" textAnchor="middle" fill="rgba(107,42,20,0.85)" fontSize="14" fontWeight="600" letterSpacing="3">MIND</text>
                  <text x="68" y="280" textAnchor="middle" fill="rgba(107,42,20,0.85)" fontSize="14" fontWeight="600" letterSpacing="3">BODY</text>
                  <text x="332" y="280" textAnchor="middle" fill="rgba(107,42,20,0.85)" fontSize="14" fontWeight="600" letterSpacing="3">SPIRIT</text>
                </g>

                {/* Center mark — the integration point */}
                <circle
                  cx="200"
                  cy="210"
                  r="4"
                  fill="rgba(107,42,20,0.9)"
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.9s ease 1.1s',
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Thesis */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <p
              className="section-label mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              Why holistic matters
            </p>
            <h2
              id="why-holistic-heading"
              className="text-foreground font-bold tracking-tight mb-7"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
                lineHeight: 1.04,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            >
              Addiction doesn&rsquo;t live only in the mind &mdash;{' '}
              <em className="not-italic text-primary">so healing can&rsquo;t either.</em>
            </h2>
            <div
              className="space-y-5 text-foreground/75 text-lg leading-relaxed max-w-2xl"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 1s ease 0.45s',
              }}
            >
              <p>
                Trauma and addiction leave tracks through the nervous system, the
                body, and the meaning a person has made of their life. Talk
                therapy reaches the mind. It doesn&rsquo;t always reach the
                other two.
              </p>
              <p>
                That&rsquo;s why every client at Seven Arrows walks a parallel
                path &mdash; clinical work on one side, body-based and spirit-
                based practice on the other. Yoga, breathwork, sweat lodge,
                sound, movement, land. Practices with lineage, held by people
                who know them.
              </p>
              <p className="text-foreground/90 font-semibold">
                The goal isn&rsquo;t a spa menu. It&rsquo;s integration &mdash;
                a life that actually holds together after treatment ends.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
