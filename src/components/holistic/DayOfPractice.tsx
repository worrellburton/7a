'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 6. "A day of practice."
 *
 * A rhythm-of-the-day timeline that shows holistic practice is woven
 * into every part of a stay, not a once-a-week extra. Time chips on
 * the left, practice + dimension tag on the right. Alternates between
 * body, mind, clinical, and ceremony blocks so the reader can see the
 * structure of a real day.
 */

type Beat = {
  time: string;
  category: 'Body' | 'Mind' | 'Clinical' | 'Creative' | 'Ceremony' | 'Rest';
  title: string;
  body: string;
};

const schedule: Beat[] = [
  {
    time: '5:45 AM',
    category: 'Mind',
    title: 'Sunrise sit',
    body: 'Silent meditation on the porch before the rest of the ranch is up. Twenty minutes and a cup of coffee.',
  },
  {
    time: '7:00 AM',
    category: 'Body',
    title: 'Trauma-informed yoga',
    body: 'Gentle hatha with a teacher who trained in Oakland and the Bay. Breath, floor work, and enough cues to opt out.',
  },
  {
    time: '9:00 AM',
    category: 'Clinical',
    title: 'Individual therapy',
    body: 'SCBT or IFS with your clinician. The session that does the narrative work the body is feeding into later.',
  },
  {
    time: '11:00 AM',
    category: 'Body',
    title: 'Breathwork + grounding',
    body: 'Physiological sigh practice, long-exhale work, feet on the ground. Down-regulation skills for the whole week.',
  },
  {
    time: '1:30 PM',
    category: 'Creative',
    title: 'Art or music group',
    body: 'Paint, clay, or guitar circle. Non-verbal processing of whatever the morning turned up.',
  },
  {
    time: '3:30 PM',
    category: 'Body',
    title: 'Ranch movement',
    body: 'Arena work with the horses, or a hike in the wash. Big-muscle movement to metabolize the day&rsquo;s stress hormones.',
  },
  {
    time: '5:30 PM',
    category: 'Rest',
    title: 'Sound bath',
    body: 'Crystal bowls and gong. Twenty-five minutes of vibratory rest before dinner.',
  },
  {
    time: '7:30 PM',
    category: 'Ceremony',
    title: 'Evening circle',
    body: 'Talking circle with a talking stick. No cross-talk, no fixing. One voice at a time, under a big sky.',
  },
];

const categoryColors: Record<Beat['category'], { bg: string; text: string }> = {
  Body: { bg: 'rgba(216,137,102,0.15)', text: 'var(--color-primary-dark)' },
  Mind: { bg: 'rgba(107,42,20,0.12)', text: 'var(--color-primary-dark)' },
  Clinical: { bg: 'rgba(60,48,42,0.15)', text: 'rgba(60,48,42,0.95)' },
  Creative: { bg: 'rgba(188,107,74,0.15)', text: 'var(--color-primary-dark)' },
  Ceremony: { bg: 'rgba(90,40,24,0.18)', text: 'rgba(60,28,18,0.95)' },
  Rest: { bg: 'rgba(120,90,75,0.14)', text: 'rgba(90,70,60,0.95)' },
};

export default function DayOfPractice() {
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
      aria-labelledby="day-of-practice-heading"
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
          <p className="section-label mb-5">A day of practice</p>
          <h2
            id="day-of-practice-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Woven through the day, <em className="not-italic text-primary">not bolted on</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Holistic practice isn&rsquo;t a Friday-afternoon extra. It sits
            inside the rhythm of every day &mdash; before, between, and after
            the clinical blocks.
          </p>
        </div>

        <ol className="relative max-w-4xl mx-auto">
          <span
            aria-hidden="true"
            className="absolute left-[62px] sm:left-[78px] top-3 bottom-3 w-px bg-primary/20"
          />
          {schedule.map((b, i) => {
            const c = categoryColors[b.category];
            return (
              <li
                key={b.time}
                className="relative flex items-start gap-4 sm:gap-7 py-5 sm:py-6"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(14px)',
                  transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
                }}
              >
                <div
                  className="w-[54px] sm:w-[68px] shrink-0 pt-0.5 text-right font-semibold text-foreground/80 tracking-tight"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.02em' }}
                >
                  {b.time}
                </div>
                <div className="relative shrink-0 pt-1.5">
                  <span
                    aria-hidden="true"
                    className="block w-3.5 h-3.5 rounded-full border-2 border-primary bg-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase"
                      style={{ background: c.bg, color: c.text, fontFamily: 'var(--font-body)' }}
                    >
                      {b.category}
                    </span>
                  </div>
                  <h3
                    className="text-foreground font-bold mb-1.5"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.3rem',
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
                </div>
              </li>
            );
          })}
        </ol>

        <p
          className="mt-12 lg:mt-16 text-center text-foreground/55 text-sm max-w-2xl mx-auto italic"
          style={{
            fontFamily: 'var(--font-display)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 1.1s',
          }}
        >
          A typical day. Real schedules flex around clinical needs, ceremony
          calendars, and weather on the land.
        </p>
      </div>
    </section>
  );
}
