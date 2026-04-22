'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Phase 6 — Clinical Modalities, bento layout.
 *
 * Six modalities. Instead of the flat 3-col card grid the page used
 * to ship, we use an asymmetric bento:
 *   - one tall hero card (photo, no text) anchors the bottom-left
 *   - the flagship Forward-Facing Freedom® card takes the first
 *     full-width row with a richer color treatment
 *   - the other five modalities are icon+copy tiles around it
 * Tiles fade in with a gentle stagger on scroll-in.
 */

type Modality = {
  title: string;
  body: string;
  Icon: (props: { className?: string }) => ReactElement;
};

const modalities: Modality[] = [
  {
    title: 'Somatic Experiencing',
    body: 'Trauma lives in the body as much as in the mind. Somatic Experiencing tunes the nervous system back into its own capacity for self-regulation — especially effective for complex trauma.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12c2.5-4 4-4 6 0s3.5 4 6 0 3-4 6 0" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Polyvagal-Informed Care',
    body: 'Drawing on Polyvagal Theory, clinicians help clients recognize fight, flight, freeze, and social-engagement states — the foundation for interrupting threat responses.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 14c3 0 3-4 6-4s3 4 6 4 3-4 6-4" />
      </svg>
    ),
  },
  {
    title: 'Psychoeducation & Reframing',
    body: 'Clients learn urges and cravings through the intrusion, arousal, avoidance cycle — reframing substance use as a predictable dysregulation response, not a failure of willpower.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L2 9l10 6 10-6-10-6z" />
        <path d="M6 12v4c0 1.5 3 3 6 3s6-1.5 6-3v-4" />
      </svg>
    ),
  },
  {
    title: 'Experiential & Community Groups',
    body: 'FFF is delivered through psychoeducation, experiential groups, and community engagement. Shared experience builds the relational connection required for healing.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
        <path d="M14 20c0-2.5 1.5-4 4-4" />
      </svg>
    ),
  },
  {
    title: 'Body-Based Interventions',
    body: 'Breathwork, movement, equine-assisted experience, and sensory grounding reconnect clients with their physical selves — the resilience that carries recovery forward.',
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4m-4 2l4-2 4 2m-4-2v8m-3-2l3 4m3-4l-3 4" />
      </svg>
    ),
  },
];

export default function ClinicalModalities() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(22px)',
    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="modalities-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">Clinical Modalities</p>
          <h2
            id="modalities-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            How we deliver TraumAddiction<span className="align-super text-[0.55em]">®</span> care.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            In our residential setting, treatment is delivered through an
            integrated combination of clinical modalities — all aligned with
            the Forward-Facing Freedom framework and trauma-informed
            principles of safety, empowerment, and collaboration.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 lg:gap-5 lg:grid-cols-12 lg:auto-rows-[minmax(180px,auto)]">
          {/* Flagship FFF tile — spans the full top row */}
          <article
            className="lg:col-span-12 p-8 lg:p-10 rounded-2xl text-white relative overflow-hidden"
            style={{
              ...style(0.1),
              background:
                'linear-gradient(115deg, var(--color-dark-section) 0%, var(--color-primary-dark) 85%)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 45% 60% at 85% 20%, rgba(216,137,102,0.35) 0%, rgba(216,137,102,0) 65%)',
              }}
            />
            <div className="relative max-w-3xl">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Primary Therapeutic Framework
              </p>
              <h3
                className="font-bold tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)', lineHeight: 1.1 }}
              >
                Forward-Facing Freedom<span className="align-super text-[0.55em]">®</span>
              </h3>
              <p className="text-white/85 leading-relaxed text-[15.5px]" style={{ fontFamily: 'var(--font-body)' }}>
                Our primary therapeutic framework — a present-focused, salutogenic
                model that prioritizes nervous-system regulation, meaning-making,
                and strengths-based care. Clients build capacity through breathwork,
                somatic awareness, and attentional practices before engaging deeper
                trauma processing.
              </p>
            </div>
          </article>

          {/* Tall photo anchor — left column rows 2–3 */}
          <div
            className="lg:col-span-5 lg:row-span-2 rounded-2xl overflow-hidden relative min-h-[320px]"
            style={style(0.2)}
          >
            <img
              src="/images/equine-therapy-portrait.jpg"
              alt="Equine therapy session at Seven Arrows."
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(10,5,3,0.05) 40%, rgba(10,5,3,0.78) 100%)' }}
            />
            <p
              className="absolute bottom-5 left-5 right-5 text-white italic text-sm lg:text-base leading-snug"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              “The body holds what the mind has not yet spoken.”
            </p>
          </div>

          {/* Five modality tiles occupy the right 7 cols */}
          {modalities.map((m, i) => {
            const Icon = m.Icon;
            return (
              <article
                key={m.title}
                className={`lg:col-span-${i === 0 || i === 1 ? '7' : i === 2 ? '7' : i === 3 || i === 4 ? '7' : '7'} rounded-2xl bg-white p-6 lg:p-7 border border-black/5 hover:border-primary/20 transition-colors`}
                style={style(0.25 + i * 0.07)}
              >
                <div className="flex items-start gap-5">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(188,107,74,0.1)' }}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3
                      className="font-bold mb-2 text-foreground"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}
                    >
                      {m.title}
                    </h3>
                    <p
                      className="text-foreground/70 text-[14.5px] leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
