'use client';

import { useEffect, useRef, useState } from 'react';

interface Beat {
  when: string;
  title: string;
  body: string;
}

const beats: Beat[] = [
  {
    when: 'Friday evening',
    title: 'Arrival + welcome circle',
    body: 'Families arrive, settle into nearby lodging we help arrange, and join a welcome circle on campus with clinicians and the cohort of clients whose families are in for the weekend.',
  },
  {
    when: 'Saturday morning',
    title: 'Family support intensive',
    body: 'Two 75-minute sessions with your loved one\'s primary clinician. Structured agenda, real repair, honest work. Breakfast and coffee on campus between sessions.',
  },
  {
    when: 'Saturday afternoon',
    title: 'The land',
    body: 'Optional hike, arena time with the horses, or quiet porch time for families who want it. The setting does some of the work — let it.',
  },
  {
    when: 'Saturday evening',
    title: 'Shared meal + community circle',
    body: 'Family-style dinner with staff, clients, and families together. An open community circle afterward under a dark sky. Partners and kids welcome for this part.',
  },
  {
    when: 'Sunday morning',
    title: 'Closing + aftercare preview',
    body: 'A final session with your clinician to consolidate what opened over the weekend, and a preview of the post-discharge family plan. Brunch before you fly home.',
  },
];

export default function FamilyWeekend() {
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
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="family-weekend-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Family weekend</p>
          <h2
            id="family-weekend-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Two days that <em className="not-italic text-primary">reset</em> the family.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every quarter we bring families to the ranch for a structured
            two-day intensive. The agenda below is approximate &mdash; your
            clinician tailors specific sessions to your family&rsquo;s
            picture ahead of time.
          </p>
        </div>

        <ol className="relative max-w-3xl mx-auto">
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-3 bottom-3 w-px bg-primary/20"
          />
          {beats.map((b, i) => (
            <li
              key={b.when}
              className="relative pl-12 pb-10 last:pb-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-primary text-primary text-[11px] font-bold inline-flex items-center justify-center"
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
                className="text-foreground font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem, 1.75vw, 1.45rem)', lineHeight: 1.15 }}
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
