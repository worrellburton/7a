'use client';

import { useEffect, useRef, useState } from 'react';

interface Level {
  tag: string;
  name: string;
  intensity: string;
  body: string;
}

const levels: Level[] = [
  {
    tag: 'PHP',
    name: 'Partial Hospitalization Program',
    intensity: '5–6 hours/day · 5 days/week',
    body: 'Highest outpatient intensity — structured day program with group and individual therapy, medication management, and a return home each evening. Recommended for clients needing close clinical containment without 24-hour residential.',
  },
  {
    tag: 'IOP',
    name: 'Intensive Outpatient Program',
    intensity: '3 hours/day · 3 days/week',
    body: 'The most common step-down. Evening-friendly schedule that lets clients return to work or school part-time while continuing group therapy and relapse-prevention work.',
  },
  {
    tag: 'OP',
    name: 'Outpatient therapy',
    intensity: 'Weekly',
    body: 'Individual therapy with a licensed provider. We refer to trusted therapists in your home state who share the trauma-informed orientation of your treatment here.',
  },
  {
    tag: 'Sober living',
    name: 'Structured recovery housing',
    intensity: 'Residential · non-clinical',
    body: 'Peer-supported sober homes for clients who need time in a substance-free environment before returning to full independent living. We maintain a vetted list across Arizona and nationally.',
  },
];

export default function StepDown() {
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
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="step-down-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Step-down care</p>
          <h2
            id="step-down-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Four rungs <em className="not-italic text-primary">down</em> from residential.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Moving from 24-hour residential straight to weekly outpatient
            therapy is often too steep a drop. The ASAM continuum offers
            intermediate levels &mdash; PHP, IOP, sober living &mdash; and we
            coordinate the warm hand-off to trusted partners at each.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          {levels.map((l, i) => (
            <article
              key={l.tag}
              className="relative rounded-2xl bg-white border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.1}s`,
              }}
            >
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.22em] uppercase bg-primary/10 text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {l.tag}
                </span>
                <span
                  className="text-[11px] tracking-[0.18em] uppercase text-foreground/55 font-semibold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {l.intensity}
                </span>
              </div>
              <h3
                className="text-foreground font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.1 }}
              >
                {l.name}
              </h3>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {l.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
