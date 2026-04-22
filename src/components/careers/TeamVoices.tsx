'use client';

import { useEffect, useRef, useState } from 'react';

interface Voice {
  quote: string;
  name: string;
  role: string;
  tenure: string;
}

const voices: Voice[] = [
  {
    quote:
      'I came from a 180-bed facility. Here I actually know every client by name and I have time to do EMDR the way I was trained to do it.',
    name: 'M.',
    role: 'Primary clinician · LCSW',
    tenure: 'Joined 2023',
  },
  {
    quote:
      'Rounds are real. Nursing, clinical, BHT, and holistic staff all in the same room. I have never worked anywhere where the yoga teacher and the medical director treat each other as peers.',
    name: 'A.',
    role: 'Behavioral health tech',
    tenure: 'Joined 2024',
  },
  {
    quote:
      'The training budget isn&rsquo;t a line item you fight for. My last two certifications were part of the job, not a personal-cost footnote.',
    name: 'R.',
    role: 'LPC · trauma track',
    tenure: 'Joined 2022',
  },
];

export default function TeamVoices() {
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
      aria-labelledby="team-voices-heading"
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
          <p className="section-label mb-5">From our team</p>
          <h2
            id="team-voices-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Three people who <em className="not-italic text-primary">already</em> made the move.
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Initials and tenure only &mdash; every staff quote used with
            permission. Names available on request.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {voices.map((v, i) => (
            <figure
              key={v.name + v.tenure}
              className={`relative rounded-2xl p-8 lg:p-9 bg-warm-bg border border-black/5 shadow-sm${
                i === 1 ? ' md:translate-y-8' : ''
              }`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? `translateY(${i === 1 ? '2rem' : '0'})` : 'translateY(22px)',
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
                  fontSize: 'clamp(1.1rem, 1.5vw, 1.35rem)',
                }}
                dangerouslySetInnerHTML={{ __html: v.quote }}
              />
              <figcaption className="pt-6 border-t border-black/10">
                <p
                  className="text-foreground font-bold"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                >
                  {v.name}
                </p>
                <p
                  className="text-primary text-[11px] tracking-[0.18em] uppercase font-semibold mt-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {v.role}
                </p>
                <p
                  className="text-foreground/55 text-[11px] tracking-[0.18em] uppercase font-semibold mt-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {v.tenure}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
