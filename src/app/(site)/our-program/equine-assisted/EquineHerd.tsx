'use client';

import { useEffect, useRef, useState } from 'react';
import HorseGallery from './HorseGallery';

/**
 * Phase 4 — Meet the herd.
 *
 * Editorial frame around the live HorseGallery. The gallery itself
 * pulls from /api/public/horses (our internal roster). Wrapping it in
 * GEO-friendly copy ("160-acre private ranch in Cochise County,
 * Arizona") gives both humans and crawlers a sense of place and
 * specificity that generic stock pages miss.
 */
export default function EquineHerd() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="meet-herd"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="herd-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Meet the herd</p>
          <h2
            id="herd-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Twelve teachers on{' '}
            <em className="not-italic text-primary">160 acres</em>.
          </h2>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our herd lives full-time at the ranch in the high desert of Cochise
            County, Arizona — ten minutes from the town of Elfrida, at the base
            of the Swisshelm Mountains. They&rsquo;re not rotated in from an
            outside barn for sessions. They know the rhythm of the property,
            the staff, and the clients who come through it.
          </p>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every horse in our program has a specific temperament and a
            specific therapeutic role. Some do groundwork only. Some carry
            clients under saddle. Some are the herd&rsquo;s anchor — the one
            who settles everyone else. Tap any of them below to read their
            story.
          </p>
        </div>

        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s',
          }}
        >
          <HorseGallery />
        </div>
      </div>
    </section>
  );
}
