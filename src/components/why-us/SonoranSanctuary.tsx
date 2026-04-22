'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Phase 3 — "A Healing Sanctuary in the Sonoran Desert".
 *
 * Full-bleed looping video backdrop (sourced from our Supabase
 * site-videos catalog) layered under a plum scrim. Left-aligned card
 * holds the narrative, with inline metro links (Phoenix / Tucson /
 * Scottsdale / Mesa) preserving the deep-link SEO of the prose
 * version.
 */
export default function SonoranSanctuary() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The `autoPlay` attribute alone can be unreliable on inner pages
  // after Next 16 hydration, so we explicitly call play() once the
  // component mounts. Muted + playsInline so mobile browsers don't
  // block autoplay.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-28 lg:py-36 text-white overflow-hidden"
      aria-labelledby="sanctuary-heading"
    >
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
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(10,5,3,0.92) 0%, rgba(12,6,4,0.75) 45%, rgba(28,14,8,0.25) 100%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.1s',
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Location
          </p>
          <h2
            id="sanctuary-heading"
            className="font-bold tracking-tight mb-7"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 4.2vw, 3.4rem)',
              lineHeight: 1.05,
            }}
          >
            A healing sanctuary in the <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Sonoran Desert</em>.
          </h2>
          <div
            className="space-y-4 text-white/85 leading-relaxed text-[17px]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <p>
              Recovery requires distance &mdash; not just from substances, but from the
              people, places, and routines that reinforce addictive behavior. Our 160-acre
              private ranch in southeastern Arizona exists far from the distractions and
              triggers of metro life.
            </p>
            <p>
              Clients who travel from{' '}
              <Link href="/locations/phoenix" className="underline decoration-accent/60 hover:decoration-accent text-white">Phoenix</Link>,{' '}
              <Link href="/locations/tucson" className="underline decoration-accent/60 hover:decoration-accent text-white">Tucson</Link>,{' '}
              <Link href="/locations/scottsdale" className="underline decoration-accent/60 hover:decoration-accent text-white">Scottsdale</Link>, and{' '}
              <Link href="/locations/mesa" className="underline decoration-accent/60 hover:decoration-accent text-white">Mesa</Link>{' '}
              consistently describe the physical separation as one of the most powerful
              parts of their healing journey. Research on destination rehabilitation
              confirms that removing clients from habitual environments significantly
              reduces relapse risk during and after treatment.
            </p>
            <p>
              Set at the base of the Swisshelm Mountains in Cochise County, the campus is
              surrounded by wide-open desert, dramatic rock formations, and skies unbroken
              by city light. The landscape itself becomes a therapeutic tool.
            </p>
          </div>
          <Link
            href="/who-we-are/areas-we-serve"
            className="inline-flex items-center gap-2 mt-8 text-accent font-semibold border-b border-accent/60 hover:border-accent pb-1 tracking-[0.1em] uppercase text-[12px] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Areas We Serve
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
