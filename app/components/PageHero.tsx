interface PageHeroProps {
  label: string;
  title: string;
  description: string;
  image?: string;
}

export default function PageHero({ label, title, description, image }: PageHeroProps) {
  return (
    <section className="relative py-14 lg:py-20 overflow-hidden">
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(245,240,235,0.95) 0%, rgba(237,228,218,0.9) 50%, rgba(220,200,180,0.85) 100%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label mb-4">{label}</p>
        <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">
          {title}
        </h1>
        <p
          className="text-foreground/70 leading-relaxed max-w-2xl text-sm lg:text-base"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
