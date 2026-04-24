'use client';

import { useEffect, useRef, useState } from 'react';

interface Offering {
  tag: string;
  title: string;
  cadence: string;
  body: string;
}

const offerings: Offering[] = [
  {
    tag: 'Weekly',
    title: 'Virtual alumni groups',
    cadence: 'Mondays at 6pm (Arizona time)',
    body: 'Facilitated alumni-only processing group — open to any alum at any stage of recovery. Attend when you need support, take space when you don’t. All meetings are consistently led by one of our Alumni Coordinators.',
  },
  {
    tag: 'Quarterly',
    title: 'Reunion weekends on the ranch',
    cadence: 'Four times a year',
    body: 'Return to campus for a weekend of groups, meals, sweat lodge, horse time, and reconnection with the staff and peers who held you during treatment. Partners and kids welcome for the Saturday evening event.',
  },
  {
    tag: 'Ongoing',
    title: 'Private alumni app',
    cadence: 'Everyday connection',
    body: 'A moderated alumni-only app for day-to-day connection — milestones, questions, asks for support, photos from the next chapter. Staff are present but the community runs itself.',
  },
  {
    tag: 'Pairs',
    title: 'Peer mentorship',
    cadence: 'Matched pairs',
    body: 'Alumni with longer recovery paired with newer alums for structured monthly check-ins. A real relationship with someone who has been exactly where you are.',
  },
];

export default function AlumniCommunity() {
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
      aria-labelledby="alumni-community-heading"
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
            The alumni community
          </p>
          <h2
            id="alumni-community-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Connection that <em className="not-italic" style={{ color: 'var(--color-accent)' }}>outlasts</em> discharge.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            The relationships built during treatment are often the thing that
            holds best over time. Four ways we keep those threads alive long
            after you leave the ranch.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
          {offerings.map((o, i) => (
            <article
              key={o.title}
              className="relative rounded-2xl p-7 lg:p-8 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.22em] uppercase bg-accent/15 text-accent"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {o.tag}
                </span>
                <span
                  className="text-[11px] tracking-[0.18em] uppercase text-white/55 font-semibold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {o.cadence}
                </span>
              </div>
              <h3
                className="font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1.1 }}
              >
                {o.title}
              </h3>
              <p
                className="text-white/75 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {o.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
