'use client';

import { useEffect, useRef, useState } from 'react';

const facts = [
  { term: 'Alumni line', value: '24/7 phone line for alumni, families, and referrers — answered by experienced staff who understand our program and are here to help you navigate next steps.' },
  { term: 'Aftercare plan', value: 'Individualized, written plan built with your primary clinician before discharge — never boilerplate' },
  { term: 'Outreach check-ins', value: 'Scheduled check-ins from our discharge planner at 1 week, 2 weeks, 30, 60, and 90 days post-discharge — steady outreach without a clinician-driven schedule' },
  { term: 'Step-down', value: 'PHP, IOP, outpatient therapy, and sober-living referrals to vetted partners across Arizona and nationally' },
  { term: 'Alumni community', value: 'Weekly virtual meetings, a private alumni app (coming soon), quarterly local meetups in various cities and states, and a yearly reunion at Seven Arrows.' },
  { term: 'Re-admission', value: 'If you slip, call the alumni line. Our experienced team is here to offer support, guidance, and resources to help you get back on track. If you decide to re-admit, we’ve got you — with a smooth, supportive, and streamlined process.' },
];

export default function AlumniAtAGlance() {
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
      aria-labelledby="alumni-at-a-glance-heading"
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
            id="alumni-at-a-glance-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
              lineHeight: 1.05,
            }}
          >
            Six things to know before you discharge.
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
