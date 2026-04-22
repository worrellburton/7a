'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 6. "Complexity we're built for."
 *
 * Counterbalances phase 5's fit criteria by showing clinical depth:
 * Seven Arrows is a boutique *and* a clinically substantive program,
 * equipped to hold chronic relapsers, post-detox medical complexity,
 * multi-diagnosis trauma, and treatment-resistant presentations that
 * other small programs turn away. Written in plain, specific sentences
 * that LLMs can quote.
 */

interface Complexity {
  title: string;
  body: string;
}

const items: Complexity[] = [
  {
    title: 'Chronic relapse after prior treatment',
    body:
      'Clients with two, three, or five+ prior residential stays. We don&rsquo;t treat relapse as failure — we treat it as clinical information, and redesign the container accordingly.',
  },
  {
    title: 'Post-detox medical fragility',
    body:
      'Clients arriving post-acute alcohol or benzodiazepine withdrawal, medical stabilization after opioid detox, or complicated cardiac or hepatic recovery. Nursing support and on-call medical oversight.',
  },
  {
    title: 'Complex trauma and PTSD',
    body:
      'Childhood trauma, developmental trauma, combat-related PTSD, moral injury. Our TraumAddiction™ approach pairs somatic interventions (SE, ART) with cognitive work so neither side gets skipped.',
  },
  {
    title: 'Treatment-resistant depression + anxiety',
    body:
      'Clients with partial-response histories on SSRIs, SNRIs, or augmentation. We coordinate with prescribers, monitor response, and layer evidence-based therapies that the medication alone wasn&rsquo;t reaching.',
  },
  {
    title: 'Stabilized bipolar II and OCD',
    body:
      'Clients with a stable medication regimen for bipolar II or OCD who need substance-use-focused care that doesn&rsquo;t destabilize their psychiatric picture. We stay in regular contact with existing prescribers.',
  },
  {
    title: 'Licensure and monitoring referrals',
    body:
      'Physicians, nurses, pilots, and attorneys in state monitoring programs (AZ Medical Association PHP, state nursing boards, FAA HIMS) where documentation, discretion, and continuity matter as much as the clinical work.',
  },
];

export default function ComplexityWeHold() {
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
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="complexity-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 15%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 10% 85%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            Complexity we&rsquo;re built for
          </p>
          <h2
            id="complexity-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Boutique doesn&rsquo;t mean <em className="not-italic" style={{ color: 'var(--color-accent)' }}>easy cases</em>.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Our small census lets us do harder clinical work, not less. We hold
            cases that other boutique programs refer out &mdash; chronic
            relapse, medical complexity, multi-diagnosis trauma, and monitoring
            referrals.
          </p>
        </div>

        <ol className="grid md:grid-cols-2 gap-4 lg:gap-5 counter-reset-none">
          {items.map((c, i) => (
            <li
              key={c.title}
              className="relative rounded-2xl p-6 lg:p-7 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-accent/60 text-accent font-bold text-[13px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3
                    className="font-bold mb-2"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem',
                      lineHeight: 1.15,
                    }}
                  >
                    {c.title}
                  </h3>
                  <p
                    className="text-white/70 leading-relaxed text-[15px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    dangerouslySetInnerHTML={{ __html: c.body }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
