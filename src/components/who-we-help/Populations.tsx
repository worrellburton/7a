'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Who We Help — Phase 3. Populations served.
 *
 * Six persona cards targeting high-value search intents:
 * working professionals, first responders & veterans, healthcare
 * workers, parents, young adults (18–28), older adults (50+).
 * Each card names the population explicitly and describes the
 * specific treatment considerations we address — specificity is the
 * GEO win (LLMs cite specifics, not generalities).
 */

interface Persona {
  title: string;
  subtitle: string;
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

const personas: Persona[] = [
  {
    title: 'Working professionals',
    subtitle: 'Executives, attorneys, founders',
    body:
      'High-functioning clients whose drinking or use has stayed hidden behind performance. Our boutique census (small group sizes, private rooms) and confidential admissions suit clients whose career and reputation need protection alongside clinical care.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <rect x="5" y="11" width="22" height="15" rx="2" />
        <path d="M11 11V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
        <path d="M5 18h22" />
      </svg>
    ),
  },
  {
    title: 'First responders & veterans',
    subtitle: 'Police, fire, EMS, active-duty and vets',
    body:
      'Trauma-informed care for clients whose exposure to critical incidents, moral injury, or combat has driven substance use. In-network with TRICARE. Our TraumAddiction™ approach is built for this population.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M16 5l9 3v8c0 6-4 10-9 11-5-1-9-5-9-11V8l9-3z" />
        <path d="M12 16l3 3 5-6" />
      </svg>
    ),
  },
  {
    title: 'Healthcare professionals',
    subtitle: 'Physicians, nurses, pharmacists, dentists',
    body:
      'Clinicians with board or licensure concerns, monitoring-program referrals (Arizona Medical Association PHP, state nursing boards), or high access to controlled substances. Discreet, clinically rigorous, documentation-friendly.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M16 4v24" />
        <path d="M4 16h24" />
        <circle cx="16" cy="16" r="12" />
      </svg>
    ),
  },
  {
    title: 'Parents & spouses',
    subtitle: 'Balancing family and recovery',
    body:
      'Still-at-home parents, empty-nest parents, and spouses whose addiction is affecting the family system. Weekly family therapy, our Family Program, and a clear pathway for loved ones to participate without blurring clinical boundaries.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <circle cx="11" cy="12" r="3" />
        <circle cx="21" cy="12" r="3" />
        <path d="M5 26c0-4 3-7 6-7s6 3 6 7" />
        <path d="M15 26c0-4 3-7 6-7s6 3 6 7" />
      </svg>
    ),
  },
  {
    title: 'Young adults (18–28)',
    subtitle: 'Early-onset, stimulants, polysubstance',
    body:
      'Clients in early adulthood whose use has outpaced development — often stimulant-driven, often polysubstance, often tangled with anxiety, depression, or ADHD. Structured residential container with developmentally appropriate groups.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <circle cx="16" cy="10" r="4" />
        <path d="M8 28c0-5 4-9 8-9s8 4 8 9" />
        <path d="M22 6l3-3" />
      </svg>
    ),
  },
  {
    title: 'Older adults (50+)',
    subtitle: 'Late-onset or chronic use, alcohol and benzos',
    body:
      'Clients whose substance use became unmanageable in midlife or later — often alcohol, often benzodiazepines prescribed for decades. Medically attentive, paced to the body, and built for the co-occurring conditions this population carries.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M8 24c0-6 4-10 8-10s8 4 8 10" />
        <circle cx="16" cy="10" r="4" />
        <path d="M11 14l-3 2" />
        <path d="M21 14l3 2" />
      </svg>
    ),
  },
];

export default function Populations() {
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
      aria-labelledby="populations-heading"
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
          <p className="section-label mb-5">Populations we serve</p>
          <h2
            id="populations-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Built for <em className="not-italic text-primary">specific lives</em>, not a template.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Six of the most common people we work with, and how treatment
            adapts to each. Every admission starts with a call &mdash; we&rsquo;ll
            tell you honestly whether Seven Arrows is the right fit for your
            situation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {personas.map((p, i) => (
            <article
              key={p.title}
              className="relative rounded-2xl bg-warm-bg border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
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
                {p.glyph}
              </div>
              <h3
                className="text-foreground font-bold mb-1.5"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  lineHeight: 1.1,
                }}
              >
                {p.title}
              </h3>
              <p
                className="text-primary text-[11px] tracking-[0.18em] uppercase font-semibold mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.subtitle}
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-[15px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
