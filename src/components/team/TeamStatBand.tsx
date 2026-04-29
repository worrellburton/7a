'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

// Three short cards that sit between the donut and the team grid.
// Earlier versions surfaced a count-up of "X clinicians, Y support
// staff" — the leadership team flagged that as gimmicky and as
// quietly highlighting the few staff members without a license, so
// this version reads as authentic prose instead. We intentionally
// leave the team prop on the API in case a future iteration
// re-introduces a single, useful number.

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  team: PublicTeamMember[];
}

const CARDS = [
  {
    eyebrow: 'A small, on-purpose roster',
    headline: 'Credentialed and experienced.',
    body: 'Our clinical team carries multiple certifications across varying treatment modalities — chosen for depth of training and lived experience, not headcount.',
  },
  {
    eyebrow: 'Trauma-informed by default',
    headline: 'Trauma specialists across the board.',
    body: 'The majority of our licensed staff and direct-care support are certified as trauma specialists or trauma clinicians, so trauma-aware practice is the floor, not a feature.',
  },
  {
    eyebrow: 'Around the clock, every day',
    headline: '24/7 on-site direct care.',
    body: 'On-site direct-care support with trauma-certified staff present every shift. The night does not feel different from the day.',
  },
];

export default function TeamStatBand(_: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [inView]);

  return (
    <section
      ref={ref}
      className="bg-white py-14 lg:py-20"
      aria-label="What our team brings"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-10 gap-x-6 lg:gap-x-8">
          {CARDS.map((c, i) => (
            <div
              key={c.headline}
              className="relative lg:px-4 lg:border-r lg:border-black/10 lg:last:border-r-0"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.eyebrow}
              </p>
              <h3
                className="text-foreground font-bold tracking-tight leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.4rem, 2.2vw, 1.75rem)',
                }}
              >
                {c.headline}
              </h3>
              <p
                className="text-foreground/65 text-sm leading-relaxed mt-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
