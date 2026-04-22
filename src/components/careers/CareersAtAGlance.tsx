'use client';

import { useEffect, useRef, useState } from 'react';

const facts = [
  { term: 'The setting', value: 'A 160-acre private ranch in Cochise County, Arizona, at the base of the Swisshelm Mountains' },
  { term: 'The work', value: 'Trauma-informed residential addiction treatment for adults, grounded in our TraumAddiction™ framework' },
  { term: 'The caseload', value: '6:1 client-to-staff ratio; primary clinicians carry small caseloads so the work stays deep' },
  { term: 'The team', value: 'Multi-disciplinary: LCSWs, LPCs, LMFTs, LISACs, RNs, psychiatric providers, BHTs, holistic practitioners, ceremony carriers' },
  { term: 'The compensation', value: 'Competitive salary, health/dental/vision, 401(k), PTO, CEU stipend, and continuing training built into the week' },
  { term: 'How to apply', value: 'Email careers@sevenarrowsrecovery.com with a cover note — we respond to every applicant' },
];

export default function CareersAtAGlance() {
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
      aria-labelledby="careers-at-a-glance-heading"
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
          <p className="section-label mb-5">The short version</p>
          <h2
            id="careers-at-a-glance-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
              lineHeight: 1.05,
            }}
          >
            What working here actually looks like.
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
