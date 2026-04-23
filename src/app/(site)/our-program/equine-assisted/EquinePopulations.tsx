'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Phase 6 — Populations helped.
 *
 * Six audience slices where EAP outperforms talk-therapy alone:
 * trauma + PTSD (including military and first responders), attachment
 * injury, grief, adolescents and young adults, shame-driven
 * high-functioning clients, and clients who've already cycled through
 * one or more traditional programs. Each card names the population
 * explicitly so GEO queries ("equine therapy for veterans",
 * "horse therapy for trauma") surface a direct citation.
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
    title: 'PTSD & complex trauma',
    subtitle: 'MST, combat, medical, developmental',
    body:
      'EAP reaches pre-verbal and implicit material that talk-therapy alone often cannot. For clients with PTSD, military sexual trauma, combat exposure, medical trauma, or complex childhood trauma, the horse is an attuned co-regulator the nervous system can actually borrow from.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M16 4l10 4v8c0 6-4 10-10 12-6-2-10-6-10-12V8l10-4z" />
        <path d="M12 16l3 3 5-6" />
      </svg>
    ),
  },
  {
    title: 'Veterans & first responders',
    subtitle: 'Active-duty, vets, police, fire, EMS',
    body:
      'We regularly treat active-duty service members, reservists, veterans, police, firefighters, and EMTs whose addiction is driven by operational stress, moral injury, or critical-incident exposure. Horses don&rsquo;t out-pressure a nervous system already trained to scan the environment — they partner with it.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M6 8l10-4 10 4v8c0 6-4 10-10 12-6-2-10-6-10-12V8z" />
        <path d="M16 10v10" />
        <path d="M11 15h10" />
      </svg>
    ),
  },
  {
    title: 'Attachment & relational wounds',
    subtitle: 'Disorganized, avoidant, anxious patterns',
    body:
      'For clients whose drinking or use patterns trace back to disrupted early attachment, groundwork with a horse is a live-action repair. The client can&rsquo;t perform their way through it. The horse only approaches if the nervous system actually settles.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <circle cx="11" cy="12" r="4" />
        <circle cx="21" cy="12" r="4" />
        <path d="M5 26c0-4 3-7 6-7s6 3 6 7" />
        <path d="M15 26c0-4 3-7 6-7s6 3 6 7" />
      </svg>
    ),
  },
  {
    title: 'Shame-driven, high-functioning',
    subtitle: 'Executives, clinicians, attorneys',
    body:
      'The population most resistant to group therapy is often the most moved by the arena. A 1,200-pound animal that isn&rsquo;t impressed by the résumé is a uniquely honest room. Many of our professional clients describe the first session as the first time they felt &ldquo;caught&rdquo; in recovery.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <rect x="5" y="11" width="22" height="15" rx="2" />
        <path d="M11 11V8a2 2 0 012-2h6a2 2 0 012 2v3" />
        <path d="M5 18h22" />
      </svg>
    ),
  },
  {
    title: 'Grief, loss & moral injury',
    subtitle: 'Bereavement, overdose loss, divorce',
    body:
      'Grief rarely resolves cognitively. The herd holds grief with a stillness people can co-regulate into without having to explain themselves. We use EAP alongside clinical grief work for clients who have lost a loved one to overdose, a marriage to addiction, or a career to moral injury.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M16 4v12" />
        <path d="M10 8h12" />
        <path d="M8 22a8 8 0 0116 0v6H8z" />
      </svg>
    ),
  },
  {
    title: 'Treatment-resistant relapse',
    subtitle: 'Multiple prior residential stays',
    body:
      'Clients who have already cycled through one or more traditional programs often describe EAP as the first modality that &ldquo;landed differently.&rdquo; When talk-therapy insight hasn&rsquo;t translated to behaviour change, body-based work with the herd can be the missing channel.',
    glyph: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true" {...s}>
        <path d="M6 16a10 10 0 0118-6" />
        <path d="M26 16a10 10 0 01-18 6" />
        <path d="M22 6v6h-6" />
        <path d="M10 26v-6h6" />
      </svg>
    ),
  },
];

export default function EquinePopulations() {
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
      aria-labelledby="equine-populations-heading"
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
          <p className="section-label mb-5">Who EAP helps most</p>
          <h2
            id="equine-populations-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Built for the populations talk-therapy{' '}
            <em className="not-italic text-primary">keeps missing</em>.
          </h2>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Equine-assisted psychotherapy is a <em>complement</em> to clinical
            care, not a replacement. It earns its place fastest with the
            populations below, where body-based and relational material is
            where the real work lives.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {personas.map((p, i) => (
            <article
              key={p.title}
              className="relative rounded-2xl bg-white border border-black/5 p-7 lg:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(216,137,102,0.18) 0%, rgba(107,42,20,0.08) 100%)',
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
                  fontSize: '1.4rem',
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
                dangerouslySetInnerHTML={{ __html: p.body }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
