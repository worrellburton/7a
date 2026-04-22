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
              className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-3.5 text-sm font-semibold tracking-wide uppercase text-white hover:bg-white hover:text-primary-dark transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              (866) 996-4308
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
