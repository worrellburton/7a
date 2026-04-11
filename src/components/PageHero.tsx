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
            'linear-gradient(135deg, rgba(251,251,253,0.97) 0%, rgba(245,245,247,0.94) 50%, rgba(232,232,237,0.9) 100%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="section-label mb-4" style={{ color: 'var(--color-primary)' }}>{label}</p>
        <h1
          className="text-2xl lg:text-4xl font-bold tracking-tight leading-tight mb-4"
          style={{ color: '#1d1d1f' }}
        >
          {title}
        </h1>
        <p
          className="leading-relaxed max-w-2xl text-sm lg:text-base"
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(26, 26, 26, 0.7)' }}
        >
          {description}
        </p>
      </div>
    </section>
  );
}
