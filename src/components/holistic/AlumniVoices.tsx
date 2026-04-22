'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 9. Alumni voices about the practices.
 *
 * Three editorial pull-quotes — each attributed to an alum-and-
 * practice pairing (what specifically reached them). Ragged grid so
 * the quotes feel dropped-in rather than templated.
 */

interface Voice {
  quote: string;
  name: string;
  stay: string;
  practice: string;
}

const voices: Voice[] = [
  {
    quote:
      'Yoga was the first place I felt anything in my body again without wanting to run from it. Small thing. Enormous thing.',
    name: 'M.',
    stay: '90-day stay · 2024',
    practice: 'Trauma-informed yoga',
  },
  {
    quote:
      'The sweat lodge wasn&rsquo;t what I came for. It&rsquo;s what I still carry. I didn&rsquo;t know I was allowed to belong anywhere that old.',
    name: 'J.',
    stay: '60-day stay · 2023',
    practice: 'Sweat lodge · evening circle',
  },
  {
    quote:
      'I was skeptical about the sound bath for exactly one session. Then my shoulders came down from my ears for the first time in a decade.',
    name: 'A.',
    stay: 'Extended stay · 2024',
    practice: 'Sound · breathwork',
  },
];

export default function AlumniVoices() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-white overflow-hidden"
      aria-labelledby="alumni-voices-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 15% 20%, rgba(216,137,102,0.08) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-16 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What it felt like</p>
          <h2
            id="alumni-voices-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            In alumni <em className="not-italic text-primary">words</em>.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Three alumni, three practices that reached them. Names shortened
            for privacy; every quote used with permission.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {voices.map((v, i) => (
            <figure
              key={v.name + v.stay}
              className={`relative rounded-2xl p-8 lg:p-9 bg-warm-bg border border-black/5 shadow-sm${
                i === 1 ? ' md:translate-y-8' : ''
              }`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? `translateY(${i === 1 ? '2rem' : '0'})` : 'translateY(24px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.12}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="block leading-none mb-3 text-primary/40"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4rem)' }}
              >
                &ldquo;
              </span>
              <blockquote
                className="text-foreground/90 leading-[1.3] mb-7"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.15rem, 1.55vw, 1.4rem)',
                }}
                dangerouslySetInnerHTML={{ __html: v.quote }}
              />
              <figcaption className="pt-6 border-t border-black/10">
                <p
                  className="text-foreground font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                  }}
                >
                  {v.name}
                </p>
                <p
                  className="text-foreground/55 text-[11px] tracking-[0.2em] uppercase font-semibold mt-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {v.stay}
                </p>
                <p
                  className="text-primary text-[11px] tracking-[0.2em] uppercase font-semibold mt-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {v.practice}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
