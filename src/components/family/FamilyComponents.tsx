'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Component {
  title: string;
  cadence: string;
  body: string;
  glyph: ReactElement;
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const components: Component[] = [
  {
    title: 'Weekly family therapy',
    cadence: 'Every week during residential',
    body: 'Licensed family therapist facilitates structured virtual sessions with the client and their closest family members. Not open-ended venting — targeted work on the specific dynamics that substance use has shaped in your system.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><circle cx="11" cy="12" r="3" /><circle cx="21" cy="12" r="3" /><path d="M5 26c0-4 3-7 6-7s6 3 6 7" /><path d="M15 26c0-4 3-7 6-7s6 3 6 7" /></svg>),
  },
  {
    title: 'Family education groups',
    cadence: 'Multi-week psychoeducation',
    body: 'Open-enrollment groups on addiction as a family disease, the neuroscience of trauma, co-regulation, enabling vs. supporting, and what to expect during and after residential care. Families can attend whether their loved one is in care or not.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M4 12l12-6 12 6-12 6z" /><path d="M8 14v6c0 2 4 4 8 4s8-2 8-4v-6" /></svg>),
  },
  {
    title: 'Dedicated family coordinator',
    cadence: 'One point of contact, the whole stay',
    body: 'A single human handles visitation, ROI paperwork, travel logistics, and any communication the clinical team can authorize. You call one number, you know one name.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" /></svg>),
  },
  {
    title: 'Visitation on the ranch',
    cadence: 'After week two',
    body: 'Structured in-person visits begin after the initial stabilization window. Family tours of campus are welcome, meals on site are encouraged, and our coordinator handles all scheduling.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M4 14l12-10 12 10" /><path d="M7 14v14h18V14" /><path d="M13 28v-7h6v7" /></svg>),
  },
  {
    title: 'Family weekends',
    cadence: 'Quarterly',
    body: 'Two-day intensives on campus — guided family therapy, joint sessions, shared meals, and optional time in the arena with the horses. Partners and kids welcome for the Saturday evening.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><circle cx="16" cy="16" r="12" /><path d="M16 8v8l5 3" /></svg>),
  },
  {
    title: 'Post-discharge family plan',
    cadence: 'Ongoing',
    body: 'Continued family therapy referrals, a family-support track inside the alumni community, and guidance on the first 90 days at home. Family work doesn\'t stop at discharge — the hardest months are still ahead.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M16 27s-10-6-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14z" /></svg>),
  },
];

export default function FamilyComponents() {
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
      id="components"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="family-components-heading"
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
          <p className="section-label mb-5">What&rsquo;s included</p>
          <h2
            id="family-components-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Six <em className="not-italic text-primary">concrete</em> supports.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Not platitudes — actual services with a cadence, a point of
            contact, and a clear start and end.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {components.map((c, i) => (
            <article
              key={c.title}
              className="relative rounded-2xl bg-white border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(216,137,102,0.16) 0%, rgba(107,42,20,0.08) 100%)',
                  color: 'var(--color-primary-dark)',
                }}
                aria-hidden="true"
              >
                {c.glyph}
              </div>
              <h3
                className="text-foreground font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
              >
                {c.title}
              </h3>
              <p
                className="text-primary text-[11px] tracking-[0.18em] uppercase font-semibold mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.cadence}
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
