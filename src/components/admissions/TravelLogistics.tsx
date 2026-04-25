'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Option {
  title: string;
  eta: string;
  body: string;
  glyph: ReactElement;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const options: Option[] = [
  {
    title: 'Fly into Tucson (TUS)',
    eta: '≈ 1 hr 45 min drive',
    body:
      'The closest airport to the ranch. Daily nonstops from Phoenix, Los Angeles, Denver, Dallas, and other Sun Belt hubs. A staff member meets you at baggage claim and drives you in.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}>
        <path d="M4 20l8-8 4 2 6-10h2l-2 12 6 4-2 4-8-4-4 4h-4l2-6-8 2z" />
      </svg>
    ),
  },
  {
    title: 'Fly into Phoenix (PHX)',
    eta: '≈ 3 hr drive',
    body:
      'Phoenix Sky Harbor is the larger international hub and often has better fares. We arrange a private transport from Sky Harbor to the ranch or meet you for a longer airport pickup.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}>
        <path d="M4 20l8-8 4 2 6-10h2l-2 12 6 4-2 4-8-4-4 4h-4l2-6-8 2z" />
      </svg>
    ),
  },
  {
    title: 'Sober transport nationwide',
    eta: 'Same day or next day',
    body:
      'For clients in active use or who need a companion on the trip, we connect you with a separate, vetted sober-transport company we partner with. A trained companion meets you at home and stays with you door-to-door.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}>
        <path d="M4 20h24" />
        <path d="M6 20l2-8h16l2 8" />
        <circle cx="10" cy="24" r="2" />
        <circle cx="22" cy="24" r="2" />
        <path d="M12 14h8" />
      </svg>
    ),
  },
  {
    title: 'Private driver + your own car',
    eta: 'By appointment',
    body:
      'Some clients prefer to be driven in their own vehicle, or drive themselves with a family member. We can coordinate either — secure parking on campus is available.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true" {...s}>
        <path d="M4 18h24v6H4z" />
        <path d="M6 18l3-8h14l3 8" />
        <circle cx="10" cy="24" r="2" fill="currentColor" />
        <circle cx="22" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export default function TravelLogistics() {
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
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="travel-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 15%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 10% 85%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            Getting here
          </p>
          <h2
            id="travel-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>Four ways</em> to arrive.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            We&rsquo;re in Cochise County, in southeastern Arizona. Our
            admissions team handles the travel details so you don&rsquo;t
            have to navigate it alone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
          {options.map((o, i) => (
            <article
              key={o.title}
              className="relative rounded-2xl p-6 lg:p-7 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.09}s`,
              }}
            >
              <div className="flex items-start gap-5">
                <div
                  className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(216,137,102,0.2) 0%, rgba(216,137,102,0.06) 100%)',
                    color: 'var(--color-accent)',
                  }}
                  aria-hidden="true"
                >
                  {o.glyph}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3 flex-wrap mb-2">
                    <h3
                      className="font-bold"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
                    >
                      {o.title}
                    </h3>
                    <span
                      className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {o.eta}
                    </span>
                  </div>
                  <p
                    className="text-white/70 leading-relaxed text-[15px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {o.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
