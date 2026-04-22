'use client';

import { useEffect, useRef, useState } from 'react';

interface Value {
  statement: string;
  body: string;
}

const values: Value[] = [
  {
    statement: 'We lead with the nervous system.',
    body:
      'Polyvagal-informed isn\'t a slogan here. It governs how we run groups, how we staff milieu, how we onboard new hires, and how we handle hard moments on and off the clock.',
  },
  {
    statement: 'We treat trauma and addiction as one case.',
    body:
      'No handoff, no silos. Every clinician on staff practices some version of trauma-aware care; every role in the building understands why we work this way.',
  },
  {
    statement: 'We protect the small census.',
    body:
      'Growth happens, but the boutique count is the whole point. We will not chase bed-day revenue into a model that breaks the thing that makes this place work.',
  },
  {
    statement: 'We share our notes.',
    body:
      'Interdisciplinary rounds are real rounds. Primary clinicians, medical, nursing, holistic, and direct care all have voice and all hear each other on every active case.',
  },
  {
    statement: 'We pay attention to our own regulation.',
    body:
      'You can\'t co-regulate with an exhausted nervous system. Staff yoga, sauna, paid rest between intakes, and a culture that says "take the afternoon" aren\'t perks — they\'re clinical tools.',
  },
  {
    statement: 'We respect lineage.',
    body:
      'Indigenous practices on the ranch are held by trusted carriers, not borrowed by our staff. Modalities have credit. Teachers have names. Programs have sources.',
  },
];

export default function OurValues() {
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
      aria-labelledby="values-heading"
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
          <p className="section-label mb-5">Our values</p>
          <h2
            id="values-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic text-primary">Six</em> commitments we actually keep.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Short enough to remember. Specific enough to catch us when we
            drift. These are what we hire for, supervise toward, and expect
            from each other.
          </p>
        </div>

        <ol className="space-y-7 relative max-w-3xl">
          <span
            aria-hidden="true"
            className="absolute left-[15px] top-3 bottom-3 w-px bg-primary/20"
          />
          {values.map((v, i) => (
            <li
              key={v.statement}
              className="relative pl-12"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-[12px] font-bold"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3
                className="text-foreground font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.3rem, 1.9vw, 1.55rem)',
                  lineHeight: 1.15,
                }}
              >
                {v.statement}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {v.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
