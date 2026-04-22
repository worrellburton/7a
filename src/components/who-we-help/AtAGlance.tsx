'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 2. "At a glance" facts strip.
 *
 * Six concrete, scannable facts that answer the implicit questions a
 * visitor (or an LLM quoting a page) asks first: who, what, how long,
 * what LOC, insurance, where. Each fact is one sentence so a model
 * can lift it verbatim. Uses dl/dt/dd for semantic clarity.
 */

interface Fact {
  term: string;
  value: string;
}

const facts: Fact[] = [
  { term: 'Who', value: 'Adults 18 and older, men and women of any background' },
  {
    term: 'What we treat',
    value:
      'Alcohol, opioids (incl. fentanyl and heroin), stimulants (meth, cocaine), benzodiazepines, prescription drugs, and polysubstance use',
  },
  {
    term: 'Co-occurring',
    value:
      'Dual-diagnosis care for anxiety, depression, PTSD, trauma, bipolar II, and OCD alongside substance use',
  },
  {
    term: 'Level of care',
    value:
      'Residential (inpatient) treatment with medically monitored support; typical stays 30, 60, or 90 days',
  },
  {
    term: 'Insurance',
    value:
      'In-network with most major plans including Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and TRICARE',
  },
  {
    term: 'Where',
    value:
      'A 160-acre private ranch in Cochise County, Arizona, at the base of the Swisshelm Mountains — clients travel from Phoenix, Tucson, and across the country',
  },
];

export default function AtAGlance() {
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
      className="relative py-20 lg:py-28 bg-warm-bg border-b border-black/5"
      aria-labelledby="at-a-glance-heading"
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
            id="at-a-glance-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.85rem, 3.8vw, 2.6rem)',
              lineHeight: 1.05,
            }}
          >
            The short version.
          </h2>
        </div>

        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10 lg:gap-y-12">
          {facts.map((f, i) => (
            <div
              key={f.term}
              className="flex flex-col"
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
