'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interventions — Phase 9b. Curated family voices specifically about
 * the intervention moment itself — not generic alum reviews. Two-up
 * grid with ken-burns portrait placeholders and overlaid pull
 * quotes; portraits fade in then a slow zoom begins.
 */

type Quote = {
  quote: string;
  attribution: string;
  photo: string;
};

const quotes: Quote[] = [
  {
    quote:
      'The specialist did not let the conversation go where we always let it go. That alone was worth everything. My son was in a car before dinner.',
    attribution: 'Parent of a 27-year-old · opioid use · 2024',
    photo: '/images/group-sunset-desert.jpg',
  },
  {
    quote:
      'Three tries at the kitchen table, three blowups. One morning with a professional — three hours, start to finish — and we were at the ranch by nightfall.',
    attribution: 'Spouse · alcohol use · 2023',
    photo: '/images/facility-exterior-mountains.jpg',
  },
  {
    quote:
      'The hardest part was the night before. The actual day was calm, specific, and short. My daughter said later she was relieved someone finally named it.',
    attribution: 'Father of a 31-year-old · stimulant use · 2024',
    photo: '/images/covered-porch-desert-view.jpg',
  },
  {
    quote:
      'He said no at first. The consequences we had rehearsed went into effect by the end of the week. He called us from the coffee shop on day nine asking for the bed.',
    attribution: 'Mother of a 24-year-old · alcohol & benzodiazepine use · 2024',
    photo: '/images/group-gathering-pavilion.jpg',
  },
];

export default function FamilyVoices() {
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
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
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
          <p className="section-label mb-5">Family Voices</p>
          <h2
            id="voices-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Four families, four <em className="not-italic text-primary">first mornings</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Names and a few identifying details shortened or changed
            for privacy. Every quote is from a family who moved forward
            after the intervention day.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          {quotes.map((q, i) => (
            <figure
              key={q.attribution}
              className="relative overflow-hidden rounded-3xl aspect-[5/4] bg-dark-section"
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
                  transform: visible ? 'scale(1.06)' : 'scale(1.12)',
                  transition: 'transform 12s ease-out',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0.25) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)',
                }}
              />
              <figcaption className="relative z-10 h-full flex flex-col justify-end p-7 lg:p-10 text-white">
                <span
                  aria-hidden="true"
                  className="block text-accent mb-2 leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
                >
                  &ldquo;
                </span>
                <blockquote
                  className="text-white/95 leading-snug"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 1.6vw, 1.45rem)' }}
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
