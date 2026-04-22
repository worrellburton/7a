'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Footer-adjacent CTA block. Full-bleed looping video backdrop that
 * cycles through the catalog. Two (or more) videos sit stacked and
 * each plays muted on its own loop; every ~11 seconds we flip which
 * one is visible with a crossfade. Both videos are warmed up on
 * mount so the crossfade never stutters waiting on metadata.
 */

const cycle = [
  siteVideos.sonoranRanch,
  siteVideos.horsesRail,
  siteVideos.ranchLife,
];

const DWELL_MS = 11_000; // how long each frame is foregrounded
const FADE_MS = 900; // opacity crossfade duration

export default function BeforeFooterCTA() {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Kick every video into play on mount. autoPlay alone is flaky
  // after hydration and with hidden (opacity 0) elements on some
  // mobile browsers; explicit play() + muted covers every case.
  useEffect(() => {
    for (const v of videoRefs.current) {
      if (!v) continue;
      v.muted = true;
      v.play().catch(() => {});
    }
  }, []);

  // Advance the visible video on a dwell timer. If the tab is
  // backgrounded we pause the cycle so the user doesn't return to a
  // mid-crossfade frozen on whichever tick fired last.
  useEffect(() => {
    let id: number | undefined;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      setActive((i) => (i + 1) % cycle.length);
    };
    id = window.setInterval(tick, DWELL_MS);
    return () => {
      if (id) window.clearInterval(id);
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="before-footer-cta-heading"
    >
      {/* Stacked full-bleed video layer — each clip autoPlays on its
          own loop, we just fade between them. */}
      <div className="absolute inset-0" aria-hidden="true">
        {cycle.map((src, i) => (
          <video
            key={src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={src}
            poster={i === 0 ? '/images/facility-exterior-mountains.jpg' : undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === active ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* Warm terracotta scrim — stronger on the left where the CTA
          column sits so the headline stays legible against any frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(107,42,20,0.82) 0%, rgba(107,42,20,0.6) 40%, rgba(107,42,20,0.25) 75%, rgba(107,42,20,0.15) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,10,6,0.2) 0%, rgba(20,10,6,0) 25%, rgba(20,10,6,0) 75%, rgba(20,10,6,0.35) 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32 min-h-[480px] flex items-center">
        <div className="max-w-xl">
          <p
            className="flex items-center gap-4 text-xs tracking-[0.22em] uppercase font-semibold text-white/90 mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="block w-10 h-px bg-white/80" aria-hidden="true" />
            We Are Here For You
          </p>
          <h2
            id="before-footer-cta-heading"
            className="font-bold tracking-tight mb-6 uppercase leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
            }}
          >
            Change your life <br className="hidden sm:block" /> with a single call.
          </h2>
          <p
            className="text-white/90 leading-relaxed mb-9 max-w-md text-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Get in touch with the caring team at Seven Arrows Recovery today and
            find out how we can help you have a life-changing experience at our
            center.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="tel:+18669964308"
              className="group inline-flex items-center gap-3 rounded-full border-2 border-white pl-2.5 pr-5 py-2 text-white hover:bg-white hover:text-primary-dark transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
              aria-label="Call us 24/7 at (866) 996-4308"
            >
              <span
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                <svg className="w-4 h-4 transition-transform group-hover:-rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-primary-dark">
                  <span className="absolute inset-0 rounded-full bg-[#4ade80] animate-ping opacity-70" />
                </span>
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                <span
                  className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/80 group-hover:text-primary-dark/70 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Available 24/7
                </span>
                <span
                  className="text-sm font-bold tracking-wide"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  (866) 996-4308
                </span>
              </span>
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Contact Us Online &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
