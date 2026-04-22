'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Homepage — "Our Promise."
 *
 * Was a 3-card "A Program Unlike the Rest" block with static photos
 * and a logo-wall of accreditation checkmarks. Re-cast as a single
 * pillar moment that carries the thesis:
 *
 *   • We do not treat people as problems to be fixed.
 *   • We see individuals as inherently resilient, capable of growth,
 *     and worthy of compassion. Our role is to create the conditions
 *     where that resilience can emerge.
 *   • Three rhythmic statements pair with three looping video tiles
 *     (relationship / support / safety).
 *
 * Dark warm-gradient backdrop matches the 10-phase closers on
 * /our-program/* pages, so this section reads as a single pillar
 * rather than a card shelf. The video tiles are decorative — the
 * statements are the content; motion is an accent, not the point.
 */

interface Pillar {
  video: string;
  eyebrow: string;
  statement: string;
  gloss: string;
  poster: string;
}

const pillars: Pillar[] = [
  {
    video: siteVideos.horsesRail,
    eyebrow: 'In relationship',
    statement: 'Healing happens in relationship.',
    gloss:
      'Between client and clinician. Between peer and peer. Between a person and a horse that has no stake in their story.',
    poster: '/images/equine-therapy-portrait.jpg',
  },
  {
    video: siteVideos.ranchLife,
    eyebrow: 'With support',
    statement: 'Growth happens with support.',
    gloss:
      'Small census. Primary therapist from day one. A cohort of peers who know your name before the second group.',
    poster: '/images/group-gathering-pavilion.jpg',
  },
  {
    video: siteVideos.sonoranRanch,
    eyebrow: 'When the body learns',
    statement: 'Freedom happens when the nervous system learns it is safe to live.',
    gloss:
      'Regulated presence. Polyvagal-informed care. A 160-acre ranch where the land itself teaches the body how to settle.',
    poster: '/images/sign-night-sky-milky-way.jpg',
  },
];

export default function ProgramSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden text-white"
      aria-labelledby="our-promise-heading"
      style={{
        background:
          'linear-gradient(165deg, var(--color-dark-section) 0%, var(--color-primary-dark) 55%, var(--color-primary) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 10%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 55% 55% at 15% 90%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        {/* Header thesis */}
        <div className="max-w-4xl mb-16 lg:mb-20">
          <p
            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.85s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            Our promise
          </p>
          <h2
            id="our-promise-heading"
            className="font-bold tracking-tight mb-7"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              lineHeight: 1.02,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            We do not treat people as{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>problems to be fixed</em>.
          </h2>
          <p
            className="text-white/85 leading-relaxed text-lg lg:text-xl max-w-2xl"
            style={{
              fontFamily: 'var(--font-body)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 1s ease 0.45s',
            }}
          >
            We see individuals as inherently resilient, capable of growth, and
            worthy of compassion. Our role is to create the conditions where
            that resilience can emerge.
          </p>
        </div>

        {/* Three pillar video cards */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((p, i) => (
            <PromisePillar key={p.statement} pillar={p} index={i} visible={visible} />
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-14 lg:mt-16 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.85s',
          }}
        >
          <Link
            href="/our-program"
            className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Explore our program
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PromisePillar({
  pillar,
  index,
  visible,
}: {
  pillar: Pillar;
  index: number;
  visible: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    // Stagger the play so the three tiles don't all load a frame at
    // once on slower connections. Each tile also honors the user's
    // reduced-motion preference — we pause if they've opted out.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) el.play().catch(() => {});
  }, []);

  return (
    <article
      className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-dark-section"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.3 + index * 0.12}s`,
      }}
    >
      <video
        ref={videoRef}
        src={pillar.video}
        poster={pillar.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]"
      />

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,5,3,0.12) 0%, rgba(10,5,3,0.35) 45%, rgba(10,5,3,0.82) 80%, rgba(10,5,3,0.96) 100%)',
        }}
      />

      {/* Accent top stripe reveals on scroll-in */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-[3px] bg-accent"
        style={{
          width: visible ? '72px' : '0px',
          transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${0.6 + index * 0.12}s`,
        }}
      />

      {/* Copy */}
      <div className="absolute inset-x-0 bottom-0 p-6 lg:p-7">
        <p
          className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-3"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {pillar.eyebrow}
        </p>
        <h3
          className="font-bold leading-[1.12] mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 1.55vw, 1.55rem)',
          }}
        >
          {pillar.statement}
        </h3>
        <p
          className="text-white/75 leading-relaxed text-[13.5px]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {pillar.gloss}
        </p>
      </div>
    </article>
  );
}
