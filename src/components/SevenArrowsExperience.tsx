import Link from 'next/link';

// Home-page "What makes us different" section. Three-part structure:
//
//   1. Guiding principles (pill chips)
//   2. Clinical Approach — Trauma Treatment + Evidence-Based Treatment,
//      linked to their dedicated program pages so visitors can drill in.
//   3. Home-away-from-home amenities — boutique facility tangibles.
//
// Keeps all three on one unified background so they read as one arc
// rather than three unrelated strips.

const principles = [
  { label: 'Holistic' },
  { label: 'Client-Focused' },
  { label: "Nature's Touch" },
  { label: 'Healing Horses' },
  { label: 'Wellness' },
  { label: 'Rooted in Healing' },
  { label: 'Indigenous' },
];

const clinical = [
  {
    title: 'Trauma Treatment',
    description: 'Addressing root causes',
    href: '/our-program/trauma-treatment',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-4.5-7-11a7 7 0 0114 0c0 6.5-7 11-7 11z" />
        <path d="M12 13a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Evidence-Based Treatment',
    description: 'CBT · DBT · EMDR',
    href: '/our-program/evidence-based',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3v5a2 2 0 01-.59 1.59L5 13M9 3l6 0M15 3v5a2 2 0 00.59 1.59L19 13" />
        <path d="M19 13l-1.48 4.45A2.25 2.25 0 0115.38 19H8.62a2.25 2.25 0 01-2.14-1.55L5 13Z" />
      </svg>
    ),
  },
];

const amenities = [
  {
    title: 'Airport Transfer',
    description: 'Free transport to & from the airport.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="9" width="16" height="11" rx="1" />
        <path d="M7 9V7a2 2 0 012-2h6a2 2 0 012 2v2" />
        <line x1="12" y1="9" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    title: 'Internet Access',
    description: 'High-speed WiFi at our boutique facility.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0114.08 0" />
        <path d="M1.42 9a16 16 0 0121.16 0" />
        <path d="M8.53 16.11a6 6 0 016.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Chef-Prepared Meals',
    description: 'Daily meals from our on-site chef.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4v8a5 5 0 0010 0V4" />
        <line x1="12" y1="12" x2="12" y2="20" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="7" y1="7" x2="17" y2="7" />
      </svg>
    ),
  },
  {
    title: 'Access to Nature',
    description: 'Arizona mountains and desert beauty.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20L10 8l5 8 3-4 4 8H3z" />
        <circle cx="18" cy="6" r="2" />
      </svg>
    ),
  },
  {
    title: 'Sweat Lodge',
    description: 'Indigenous tradition for healing & wellness.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18Q12 4 20 18" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <line x1="12" y1="8" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    title: 'Fitness & Trails',
    description: 'Heal your physical self through movement.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18Q8 14 12 16Q16 18 20 14" />
        <circle cx="19" cy="6" r="2" />
        <path d="M18 8l-2 4 3 2-2 4" />
      </svg>
    ),
  },
];

export default function SevenArrowsExperience() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="experience-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Intro — principles + CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label justify-center mb-4">What Makes Us Different</p>
          <h2
            id="experience-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4"
          >
            The Seven Arrows Experience
          </h2>
          <p
            className="text-foreground/60 leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our program is rooted in 7 core components combining traditional, holistic,
            evidence-based, alternative and spiritual approaches for a truly healing
            experience of mind, body and spirit.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {principles.map((p) => (
              <div
                key={p.label}
                className="bg-warm-bg rounded-full px-5 py-2.5 text-sm font-medium text-foreground/70 border border-gray-100 hover:border-primary/30 hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.label}
              </div>
            ))}
          </div>

          <Link href="/who-we-are/why-us" className="btn-outline">
            Our Seven Core Principles
          </Link>
        </div>

        {/* Divider between the principle chips above and the clinical
            approach cards below — same warm tone, feels like a
            continuation rather than a new section. */}
        <div className="my-16 lg:my-20 max-w-xs mx-auto h-px bg-foreground/10" aria-hidden="true" />

        {/* Clinical Approach — linked to dedicated program pages */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-3">Clinical Approach</p>
          <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            The work that makes recovery last
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 lg:gap-6 max-w-4xl mx-auto mb-16 lg:mb-20">
          {clinical.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="card-soft p-6 lg:p-7 flex items-start gap-4 group hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(42,15,10,0.18)] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p
                  className="text-sm text-foreground/60 leading-relaxed mb-3"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.description}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Learn more
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Amenities — the concrete side of the experience */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-3">A Boutique Treatment Experience</p>
          <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Your home away from home
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {amenities.map((amenity) => (
            <div key={amenity.title} className="card-soft p-6 lg:p-7 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {amenity.icon}
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground mb-1.5">{amenity.title}</h4>
                <p
                  className="text-sm text-foreground/60 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {amenity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
