interface PageHeroProps {
  label: string;
  title: string;
  description: string;
}

export default function PageHero({ label, title, description }: PageHeroProps) {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(245,240,235,0.95) 0%, rgba(237,228,218,0.9) 50%, rgba(220,200,180,0.85) 100%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label mb-4">{label}</p>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
          {title}
        </h1>
        <p
          className="text-foreground/70 leading-relaxed max-w-2xl text-lg"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
