'use client';

import { useEffect, useRef, useState } from 'react';

const facts = [
  { term: 'Who', value: 'Parents, partners, adult children, siblings, and chosen family of Seven Arrows clients' },
  { term: 'Cost', value: 'Included in your loved one\'s program of care at no additional charge' },
  { term: 'Family therapy', value: 'Weekly virtual sessions with a licensed family therapist, starting the second week of residential' },
  { term: 'Education', value: 'Open-enrollment multi-week psychoeducation groups on addiction, trauma, boundaries, and co-regulation' },
  { term: 'Coordinator', value: 'Single point of contact for visitation, ROI paperwork, travel, and anything else the family needs' },
  { term: 'After discharge', value: 'Family program continues — quarterly alumni family events and referrals to family-focused outpatient providers' },
];

export default function FamilyAtAGlance() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-20 lg:py-28 bg-warm-bg border-b border-black/5"
      aria-labelledby="family-at-a-glance-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">At a glance</p>
          <h2
            id="family-at-a-glance-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
              lineHeight: 1.05,
            }}
          >
            Six things families ask first.
          </h2>
        </div>

        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10 lg:gap-y-12">
          {facts.map((f, i) => (
            <div
              key={f.term}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <dt
                className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary mb-3 pb-3 border-b border-primary/25"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {f.term}
              </dt>
              <dd
                className="text-foreground/80 text-[15.5px] leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
