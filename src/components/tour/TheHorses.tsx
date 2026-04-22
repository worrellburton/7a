'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { siteVideos } from '@/lib/siteVideos';

/**
 * Tour — Phase 7. Feature section for the equine program. Left side
 * has a full-bleed looping video of the horses at the rail with an
 * overlay pull-quote; right side has the prose and a CTA over to the
 * equine-assisted program page.
 */
export default function TheHorses() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="horses-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
          <figure
            className="lg:col-span-7 relative aspect-[4/3] lg:aspect-[5/6] rounded-3xl overflow-hidden bg-dark-section"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <video
              ref={videoRef}
              src={siteVideos.horsesRail}
              poster="/images/equine-therapy-portrait.jpg"
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
                  'linear-gradient(180deg, rgba(10,5,3,0.05) 40%, rgba(10,5,3,0.45) 75%, rgba(10,5,3,0.92) 100%)',
              }}
            />
            <figcaption className="absolute inset-x-7 bottom-7 lg:inset-x-10 lg:bottom-10 text-white max-w-md">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Meet the herd
              </p>
              <p
                className="italic leading-[1.3]"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 1.9vw, 1.7rem)' }}
              >
                <span className="text-accent mr-1" style={{ fontSize: '1.6em', lineHeight: 0 }}>“</span>
                Horses mirror what words cannot. They feel the body’s truth
                before the mind catches up.
              </p>
            </figcaption>
          </figure>

          <div
            className="lg:col-span-5 flex flex-col justify-center"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <p className="section-label mb-5">The Equine Program</p>
            <h2
              id="horses-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.7vw, 2.8rem)', lineHeight: 1.05 }}
            >
              One client. <em className="not-italic text-primary">One horse.</em> For the whole stay.
            </h2>
            <div className="space-y-4 text-foreground/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <p>
                Every client at Seven Arrows is paired with their own horse
                for the duration of treatment. That daily one-on-one
                relationship builds trust, emotional regulation, and the kind
                of nonverbal honesty that accelerates breakthroughs in ways
                talk therapy alone cannot.
              </p>
              <p>
                The herd is worked in the open desert by certified
                equine-assisted therapists. It is part of why clients travel
                here from out of state.
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/our-program/equine-assisted" className="btn-primary">
                Discover the equine program
              </Link>
              <a
                href="tel:+18669964308"
                className="inline-flex items-center justify-center gap-2 text-foreground font-semibold border-b border-foreground/70 pb-1 tracking-[0.1em] uppercase text-[12px] hover:text-primary hover:border-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Call to ask about the herd
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
