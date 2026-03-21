import Link from 'next/link';

const principles = [
  { icon: '🌿', label: 'Holistic' },
  { icon: '👥', label: 'Client-Focused' },
  { icon: '⛰️', label: "Nature's Touch" },
  { icon: '🐴', label: 'Healing Horses' },
  { icon: '💚', label: 'Wellness in Everything' },
  { icon: '🌱', label: 'Rooted in Healing' },
  { icon: '🪶', label: 'Indigenous Connections' },
];

export default function SevenArrowsExperience() {
  return (
    <section className="py-20 lg:py-28 bg-white relative overflow-hidden" aria-labelledby="experience-heading">
      {/* Subtle background watermark */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cpath d='M100 20 L120 80 L100 60 L80 80 Z' fill='%23a0522d'/%3E%3Ccircle cx='100' cy='100' r='30' stroke='%23a0522d' fill='none' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary/30">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
          </div>
        </div>

        <p className="section-label justify-center mb-4">
          What Makes Us Different from the Rest
        </p>
        <h2
          id="experience-heading"
          className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6"
        >
          The Seven Arrows Experience Defined.
        </h2>
        <p
          className="text-foreground/70 leading-relaxed max-w-3xl mx-auto mb-10"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Choosing Seven Arrows Recovery for addiction treatment in Arizona means that you
          are choosing a different approach to addiction treatment. Our program is rooted
          in 7 core components that combine traditional, holistic, evidence-based,
          alternative and spiritual approaches to allow for a truly healing experience
          for your mind, your body and your spirit.
        </p>

        {/* 7 Principles */}
        <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 mb-12">
          {principles.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-foreground/80">
              <span className="text-primary text-lg">{p.icon}</span>
              <span
                className="text-sm font-medium"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.label}
              </span>
            </div>
          ))}
        </div>

        <Link href="/our-program" className="btn-dark">
          Our Seven Core Principles
        </Link>
      </div>
    </section>
  );
}
