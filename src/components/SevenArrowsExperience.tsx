import Link from 'next/link';

const principles = [
  { label: 'Holistic', emoji: '' },
  { label: 'Client-Focused', emoji: '' },
  { label: "Nature's Touch", emoji: '' },
  { label: 'Healing Horses', emoji: '' },
  { label: 'Wellness', emoji: '' },
  { label: 'Rooted in Healing', emoji: '' },
  { label: 'Indigenous', emoji: '' },
];

export default function SevenArrowsExperience() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="experience-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="section-label justify-center mb-4">
          What Makes Us Different
        </p>
        <h2
          id="experience-heading"
          className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4"
        >
          The Seven Arrows Experience
        </h2>
        <p
          className="text-foreground/60 leading-relaxed max-w-2xl mx-auto mb-12"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Our program is rooted in 7 core components combining traditional, holistic,
          evidence-based, alternative and spiritual approaches for a truly healing
          experience of mind, body and spirit.
        </p>

        {/* 7 Principles as pill tags */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
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
    </section>
  );
}
