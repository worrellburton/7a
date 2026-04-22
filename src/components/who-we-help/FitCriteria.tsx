'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 5. "Is this right for you?"
 *
 * Two columns of explicit criteria — a "good fit" list and a "we may
 * refer out" list. Clear inclusion/exclusion content is the single
 * strongest GEO pattern (LLMs quote explicit criteria almost verbatim)
 * and also a relief for prospective clients who are tired of pages
 * that say "we treat everyone."
 */

interface Criterion {
  title: string;
  body: string;
}

const goodFit: Criterion[] = [
  {
    title: 'You are 18 or older and willing to engage',
    body:
      'Our program is voluntary, adult, and residential. Readiness matters more than perfection — you don&rsquo;t need to be motivated every minute to benefit from treatment.',
  },
  {
    title: 'You have completed medical detox (or don\'t need one)',
    body:
      'We accept clients post-detox. If you&rsquo;re still in acute withdrawal, we coordinate a partnered detox stay first so you arrive medically stable.',
  },
  {
    title: 'You have a diagnosed or suspected substance use disorder',
    body:
      'Alcohol, opioids, stimulants, benzodiazepines, cannabis, or polysubstance use — with or without a formal DSM-5 diagnosis on file at intake.',
  },
  {
    title: 'You have co-occurring mental-health symptoms',
    body:
      'Anxiety, depression, PTSD, ADHD, or stabilized bipolar II that have been feeding or following the substance use. Our dual-diagnosis program is built for this.',
  },
  {
    title: 'You can participate in group and land-based programming',
    body:
      'Residential care is relational. You&rsquo;ll share space, meals, groups, and the ranch with a small cohort of peers.',
  },
  {
    title: 'You want a small, private, trauma-informed setting',
    body:
      'If a 200-bed chain feels wrong, Seven Arrows is the alternative — boutique census, private rooms, a 160-acre ranch.',
  },
];

const mayReferOut: Criterion[] = [
  {
    title: 'Active psychosis or unstable mania',
    body:
      'Clients experiencing active psychotic symptoms or unmanaged manic episodes need a higher level of psychiatric care than our residential program provides. We&rsquo;ll help you find the right placement.',
  },
  {
    title: 'Acute medical detox requiring hospital-level care',
    body:
      'Severe alcohol or benzodiazepine withdrawal, complicated opioid detox with medical comorbidities, or any condition needing ICU-level monitoring. We partner with detox facilities to bridge the gap.',
  },
  {
    title: 'Imminent suicidal or homicidal intent',
    body:
      'Clients in acute crisis need inpatient psychiatric stabilization before residential SUD treatment. We&rsquo;ll stay in contact and welcome you once stabilized.',
  },
  {
    title: 'Severe cognitive impairment',
    body:
      'Advanced dementia or significant traumatic brain injury that prevents engaging in group or individual therapy. Specialized neurorehab settings are a better fit.',
  },
  {
    title: 'Court-ordered clients requiring locked units',
    body:
      'Seven Arrows is a voluntary, open residential setting. Clients who require a secure or locked facility per court mandate need a different level of care.',
  },
  {
    title: 'Clients under 18',
    body:
      'We serve adults 18 and older only. For adolescents, we&rsquo;re happy to recommend trusted partners who specialize in teen addiction treatment.',
  },
];

export default function FitCriteria() {
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
      aria-labelledby="fit-criteria-heading"
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
          <p className="section-label mb-5">Is this right for you?</p>
          <h2
            id="fit-criteria-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Honest about <em className="not-italic text-primary">fit</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team will tell you candidly whether we&rsquo;re the
            right place for your situation. When we aren&rsquo;t, we refer to
            trusted partners who are.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Good fit */}
          <div
            className="rounded-2xl p-8 lg:p-10 bg-warm-bg border border-primary/20"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <p
              className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.24em] uppercase text-primary mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Good fit
            </p>
            <h3
              className="text-foreground font-bold mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}
            >
              Seven Arrows is likely right for you if&hellip;
            </h3>
            <ul className="space-y-5">
              {goodFit.map((c) => (
                <li key={c.title}>
                  <p
                    className="text-foreground font-semibold mb-1"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    {c.title}
                  </p>
                  <p
                    className="text-foreground/70 leading-relaxed text-[14.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    dangerouslySetInnerHTML={{ __html: c.body }}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Refer out */}
          <div
            className="rounded-2xl p-8 lg:p-10 bg-warm-bg border border-black/10"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <p
              className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.24em] uppercase text-foreground/55 mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
              We may refer out
            </p>
            <h3
              className="text-foreground font-bold mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}
            >
              We may not be the right level of care if&hellip;
            </h3>
            <ul className="space-y-5">
              {mayReferOut.map((c) => (
                <li key={c.title}>
                  <p
                    className="text-foreground/85 font-semibold mb-1"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    {c.title}
                  </p>
                  <p
                    className="text-foreground/65 leading-relaxed text-[14.5px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {c.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
