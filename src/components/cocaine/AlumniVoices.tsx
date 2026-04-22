'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cocaine — Phase 9. Curated alumni voices specifically about cocaine
 * recovery. Three overlaid-portrait tiles; slow ken-burns zoom.
 */

const quotes = [
  {
    quote:
      "I came in thinking I had a willpower problem. I left understanding I had a nervous-system problem. That single reframe is what made the difference.",
    attribution: 'Alumnus · 18 months sober · stimulant use',
    photo: '/images/covered-porch-desert-view.jpg',
  },
  {
    quote:
      "The dopamine didn't return for four weeks. When it did, it came through a specific thing — sunlight on my face during morning yoga. That moment told me my brain was coming back.",
    attribution: 'Alumna · 2 years sober · polysubstance incl. cocaine',
    photo: '/images/group-sunset-desert.jpg',
  },
  {
    quote:
      'Equine therapy wrecked me in the best way. A horse refused to come near me for a week. When she finally did, it was the first time my body believed I was safe to be around.',
    attribution: 'Alumnus · 14 months sober · cocaine + alcohol',
    photo: '/images/facility-exterior-mountains.jpg',
  },
];

export default function AlumniVoices() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
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
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="voices-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Alumni Voices</p>
          <h2
            id="voices-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Three alumni, three{' '}
            <em className="not-italic text-primary">first moments the baseline came back</em>.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {quotes.map((q, i) => (
            <figure
              key={q.attribution}
              className="relative overflow-hidden rounded-3xl aspect-[4/5] bg-dark-section"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.photo}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: visible ? 'scale(1.05)' : 'scale(1.12)',
                  transition: 'transform 14s ease-out',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0.2) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)',
                }}
              />
              <figcaption className="relative z-10 h-full flex flex-col justify-end p-7 lg:p-9 text-white">
                <span
                  aria-hidden="true"
                  className="block text-accent mb-2 leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
                >
                  &ldquo;
                </span>
                <blockquote
                  className="text-white/95 leading-snug"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.05rem, 1.55vw, 1.35rem)' }}
                >
                  {q.quote}
                </blockquote>
                <p
                  className="mt-5 pt-4 border-t border-white/15 text-[11px] tracking-[0.22em] uppercase font-semibold text-accent"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {q.attribution}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
