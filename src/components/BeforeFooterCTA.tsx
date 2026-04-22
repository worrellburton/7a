'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Footer-adjacent CTA block. Full-bleed looping video under a warm
 * terracotta scrim; text sits over the video, anchored left with
 * plenty of breathing room. Poster image keeps first paint clean.
 */
export default function BeforeFooterCTA() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="before-footer-cta-heading"
    >
      {/* Full-bleed looping video */}
      <video
        ref={videoRef}
        src={siteVideos.sonoranRanch}
        poster="/images/facility-exterior-mountains.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Warm terracotta scrim — keeps the text legible against any
          frame of the video without dragging the mood away from the
          brand color. Slightly stronger from the left so the CTA
          column reads cleanly. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(107,42,20,0.82) 0%, rgba(107,42,20,0.6) 40%, rgba(107,42,20,0.25) 75%, rgba(107,42,20,0.15) 100%)',
        }}
      />
      {/* Soft vertical falloff so the top and bottom ease into the
          surrounding page chrome. */}
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
