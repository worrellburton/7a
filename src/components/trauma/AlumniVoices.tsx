'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 9 — Alumni voices.
 *
 * Three portrait tiles with alumni quotes overlaid at the bottom.
 * Desktop: 3-up grid. Tiles breathe with a slow Ken-Burns-style zoom
 * so the section never feels static. Overlaid serif pull-quote with
 * an attribution line below.
 */

const voices = [
  {
    image: '/images/individual-therapy-session.jpg',
    alt: 'Individual therapy session in the Seven Arrows residence.',
    quote:
      'I spent years trying to stop drinking. Seven Arrows was the first place that helped me understand why I started.',
    attribution: 'Michael T. · alumnus, 2 years sober',
  },
  {
    image: '/images/group-therapy-room.jpg',
    alt: 'Intimate group therapy space at Seven Arrows.',
    quote:
      'They treated my trauma and my addiction as one thing — because they are. That changed everything.',
    attribution: 'James R. · alumnus, 18 months sober',
  },
  {
    image: '/images/covered-porch-desert-view.jpg',
    alt: 'Covered porch overlooking the Arizona desert.',
    quote:
      'We finally have our son back. The kind of back I had forgotten was possible.',
    attribution: 'Sarah K. · family member',
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
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="voices-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Alumni Voices</p>
          <h2
            id="voices-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            The work, in their own words.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-7">
          {voices.map((v, i) => (
            <figure
              key={v.image}
              className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.14}s`,
              }}
            >
              <img
                src={v.image}
                alt={v.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  animation: `kenBurns ${22 + i * 2}s ease-in-out ${i * 2}s infinite alternate`,
                  transformOrigin: i === 1 ? 'right center' : 'center',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,5,3,0.1) 30%, rgba(10,5,3,0.55) 70%, rgba(10,5,3,0.92) 100%)',
                }}
              />
              <figcaption className="absolute left-5 right-5 bottom-5 lg:left-6 lg:right-6 lg:bottom-6">
                <blockquote
                  className="text-white leading-[1.35]"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1rem, 1.35vw, 1.2rem)',
                  }}
                >
                  <span
                    className="text-accent mr-1"
                    style={{ fontSize: '1.6em', lineHeight: 0 }}
                  >
                    “
                  </span>
                  {v.quote}
                </blockquote>
                <p
                  className="mt-3 text-[10.5px] uppercase tracking-[0.22em] text-accent font-semibold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {v.attribution}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -1%); }
        }
      `}</style>
    </section>
  );
}
