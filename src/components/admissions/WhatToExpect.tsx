'use client';

import { useEffect, useRef, useState } from 'react';

interface Beat {
  when: string;
  title: string;
  body: string;
}

const arrival: Beat[] = [
  {
    when: 'Hour 0',
    title: 'Arrival + welcome',
    body: 'You are met at the airport or driveway by a staff member. Quick tour of the grounds, your room, and where things live. Meal and rest.',
  },
  {
    when: 'Day 1',
    title: 'Medical + clinical intake',
    body: 'Nursing does vitals, reviews medications, and syncs with your prior prescribers. Your primary clinician meets with you for a longer 60-minute intake.',
  },
  {
    when: 'Days 1–3',
    title: 'Treatment plan built',
    body: 'The clinical team (primary, medical, nursing, psychiatric) reviews your intake at interdisciplinary rounds and finalizes your individualized treatment plan with you.',
  },
  {
    when: 'Week 1',
    title: 'Groups + primary therapy begin',
    body: 'Daily process groups, individual therapy with your primary clinician, and your first holistic sessions (yoga, breathwork, sound). Meals with peers. First circle.',
  },
  {
    when: 'Weeks 2–4',
    title: 'Deeper work',
    body: 'EMDR, ART, or IFS work with your primary as indicated. Equine-assisted sessions begin. Family therapy phone call with loved ones. Aftercare planning starts.',
  },
  {
    when: 'Discharge',
    title: 'Step-down + aftercare',
    body: 'Written aftercare plan (outpatient, sober living, psychiatric follow-up, alumni program). We hand you off warmly and stay in touch.',
  },
];

export default function WhatToExpect() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="what-to-expect-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What to expect</p>
          <h2
            id="what-to-expect-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            From arrival through <em className="not-italic text-primary">discharge</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            A rough arc of a typical stay. Your actual timeline flexes with
            clinical needs, but this is the shape most clients move through.
          </p>
        </div>

        <ol className="relative max-w-4xl">
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-3 bottom-3 w-px bg-primary/20"
          />
          {arrival.map((b, i) => (
            <li
              key={b.title}
              className="relative pl-12 pb-10 last:pb-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-primary/40 text-primary text-[11px] font-bold inline-flex items-center justify-center"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-1.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {b.when}
              </p>
              <h3
                className="text-foreground font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.25rem, 1.8vw, 1.5rem)',
                  lineHeight: 1.15,
                }}
              >
                {b.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {b.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
