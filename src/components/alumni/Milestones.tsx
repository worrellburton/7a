'use client';

import { useEffect, useRef, useState } from 'react';

interface Marker {
  when: string;
  title: string;
  body: string;
}

const markers: Marker[] = [
  { when: '30 days', title: 'First monthly chip', body: 'Mailed to you with a note from your primary clinician.' },
  { when: '90 days', title: 'Ninety-day call', body: 'A structured check-in with your primary — you made it through the hardest window.' },
  { when: '6 months', title: 'Half-year reunion invite', body: 'First reunion weekend invitation if you haven\'t made it back yet. Travel help available.' },
  { when: '1 year', title: 'Year-one return', body: 'Most alumni return to the ranch around their first anniversary. Dinner, circle, sweat lodge, a whole evening dedicated to your cohort.' },
  { when: '2–5 years', title: 'Mentor invitation', body: 'Opportunity to join the peer-mentorship program. Many alumni find giving back deepens their own recovery.' },
  { when: 'Every year', title: 'Anniversary note', body: 'A written note from your clinician on your sobriety anniversary — every year, without fail.' },
];

export default function Milestones() {
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
      className="py-24 lg:py-32 bg-white"
      aria-labelledby="milestones-heading"
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
          <p className="section-label mb-5">Milestones</p>
          <h2
            id="milestones-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            We remember <em className="not-italic text-primary">your dates</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Small markers through the first year and beyond. The kind of
            recognition that sounds minor on paper but lands hard when it
            arrives in your mailbox.
          </p>
        </div>

        <ol className="relative max-w-3xl mx-auto">
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-3 bottom-3 w-px bg-primary/20"
          />
          {markers.map((m, i) => (
            <li
              key={m.when}
              className="relative pl-12 pb-8 last:pb-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 w-8 h-8 rounded-full bg-warm-bg border-2 border-primary text-primary text-[11px] font-bold inline-flex items-center justify-center"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <p
                className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-1.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {m.when}
              </p>
              <h3
                className="text-foreground font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 1.75vw, 1.4rem)', lineHeight: 1.15 }}
              >
                {m.title}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {m.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
