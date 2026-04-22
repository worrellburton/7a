'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Footer-adjacent CTA block. Left column is a muted looping video of
 * the Sonoran ranch (served from our Supabase site-videos bucket);
 * right column is the terracotta call-to-action panel. Poster image
 * shows on first paint so the block never flashes empty.
 */
export default function BeforeFooterCTA() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Explicitly call play() on mount — the autoPlay attribute alone is
  // flaky after Next 16 hydration; muted + playsInline keeps mobile
  // browsers from blocking.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <section className="bg-primary" aria-labelledby="before-footer-cta-heading">
      <div className="grid lg:grid-cols-2 min-h-[420px]">
        <div className="relative min-h-[260px] lg:min-h-0 overflow-hidden bg-dark-section">
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
          {/* Soft scrim to keep the video from competing with the CTA
              panel's warmer tone at the lg seam. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(188,107,74,0.18) 100%)',
            }}
          />
        </div>

        <div className="flex items-center px-6 sm:px-10 lg:px-16 py-14 lg:py-20 text-white">
          <div className="max-w-md">
            <p
              className="flex items-center gap-4 text-xs tracking-[0.22em] uppercase font-semibold text-white/90 mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
              We Are Here For You
            </p>
            <h2
              id="before-footer-cta-heading"
              className="text-3xl lg:text-[2.5rem] font-bold leading-[1.1] uppercase tracking-tight mb-6"
            >
              Change Your Life With A Single Call
            </h2>
            <p
              className="text-white/80 leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Get in touch with the caring team at Seven Arrows Recovery today and find out how we
              can help you have a life-changing experience at our center.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="tel:+18669964308"
                className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-3 text-sm font-semibold tracking-wide uppercase text-white hover:bg-white hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                (866) 996-4308
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Contact Us Online &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
