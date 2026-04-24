'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Component {
  title: string;
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
    title: 'Written aftercare plan',
    body: 'Built collaboratively with your primary clinician before discharge. Covers outpatient providers, MAT coordination, recovery-community anchors, and a relapse-prevention plan with named coping skills for your specific triggers.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M8 4h12l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M20 4v6h6" /><path d="M11 18h10" /><path d="M11 22h8" /></svg>),
  },
  {
    title: 'Outpatient therapist referrals',
    body: 'Vetted referrals to therapists licensed in your home state who specialize in your clinical picture. Warm hand-off with release-of-information so your new provider starts with the full treatment summary.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><circle cx="11" cy="13" r="4" /><circle cx="21" cy="13" r="4" /><path d="M5 26c1-4 3-6 6-6s5 2 6 6" /><path d="M15 26c1-4 3-6 6-6s5 2 6 6" /></svg>),
  },
  {
    title: 'Psychiatric continuity',
    body: 'If you\'re on medication, we coordinate directly with a psychiatric prescriber in your area so there is no gap in care. We share med history, dose responses, and the clinical reasoning behind changes during your stay.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><rect x="4" y="12" width="24" height="10" rx="5" /><path d="M16 12v10" /></svg>),
  },
  {
    title: 'Sober-living placement',
    body: 'A vetted list of sober-living homes across Arizona and nationally. We coordinate the move directly, from interview and deposit to first-day arrival, for clients stepping down into that environment.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M4 14l12-10 12 10" /><path d="M7 14v14h18V14" /><path d="M13 28v-7h6v7" /></svg>),
  },
  {
    title: 'Alumni program access',
    body: 'Enjoy lifetime access to our alumni community with weekly virtual meetings, daily connection through our private app, in-person meetups, and an annual reunion at Seven Arrows.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><circle cx="16" cy="16" r="12" /><path d="M4 16h24" /><path d="M16 4c4 4 4 20 0 24" /><path d="M16 4c-4 4-4 20 0 24" /></svg>),
  },
  {
    title: 'Family plan',
    body: 'If family was involved during treatment, aftercare extends to them. We offer guidance and can connect them with resources to support ongoing growth and healing.',
    glyph: (<svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}><path d="M16 27s-10-6-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 8-10 14-10 14z" /></svg>),
  },
];

export default function AftercarePlan() {
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
      id="aftercare-plan"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="aftercare-plan-heading"
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
          <p className="section-label mb-5">The aftercare plan</p>
          <h2
            id="aftercare-plan-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            <em className="not-italic text-primary">Six components</em>, built for your life.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every aftercare plan is written, specific, and portable. Not a
            checklist template — a document that reflects your clinical
            picture and where you&rsquo;re going next.
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
                className="text-foreground font-bold mb-3"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.15 }}
              >
                {c.title}
              </h3>
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
