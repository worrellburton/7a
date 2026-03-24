const amenities = [
  {
    title: 'Airport Transfer',
    description: 'We offer free transport to & from the airport at Seven Arrows.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="18" width="32" height="22" rx="2" />
        <path d="M14 18V12a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" />
        <line x1="24" y1="18" x2="24" y2="40" />
      </svg>
    ),
  },
  {
    title: 'Internet Access',
    description: 'Clients enjoy access to high speed WiFi at our boutique facility.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 20a20 20 0 0 1 32 0" />
        <path d="M14 26a12 12 0 0 1 20 0" />
        <path d="M20 32a5 5 0 0 1 8 0" />
        <circle cx="24" cy="38" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Chef-Prepared Meals',
    description: 'Our clients enjoy daily meals prepared by our staff chef.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8v12a10 10 0 0 0 20 0V8" />
        <line x1="24" y1="20" x2="24" y2="40" />
        <line x1="16" y1="40" x2="32" y2="40" />
        <line x1="14" y1="14" x2="34" y2="14" />
      </svg>
    ),
  },
  {
    title: 'Access to Nature',
    description: 'Experience the beauty of the Arizona mountains and desert.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 40 L20 14 L28 28 L34 20 L42 40 Z" />
        <circle cx="36" cy="12" r="4" />
      </svg>
    ),
  },
  {
    title: 'Sweat Lodge',
    description: 'An indigenous tradition that promotes healing & wellness.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 36 Q24 8 40 36" />
        <line x1="8" y1="36" x2="40" y2="36" />
        <line x1="24" y1="16" x2="24" y2="36" />
        <path d="M16 36 Q24 22 32 36" />
      </svg>
    ),
  },
  {
    title: 'Fitness & Walking Trails',
    description: 'Discover the benefits of healing your physical self.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 36 Q16 28 24 32 Q32 36 40 28" />
        <path d="M12 30 Q20 22 28 26 Q36 30 44 22" />
        <circle cx="38" cy="12" r="3" />
        <path d="M36 16 L32 24 L38 28 L34 36" />
      </svg>
    ),
  },
];

export default function Amenities() {
  return (
    <section
      className="py-20 lg:py-28 bg-white relative overflow-hidden"
      aria-labelledby="amenities-heading"
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 10 L70 50 L60 40 L50 50 Z' fill='%23a0522d'/%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p
            className="section-label justify-center mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            A Boutique Treatment Experience
          </p>
          <h2
            id="amenities-heading"
            className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Welcome to Your Home Away From Home
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
          {amenities.map((amenity) => (
            <div key={amenity.title} className="flex gap-4">
              <div className="flex-shrink-0 text-primary">{amenity.icon}</div>
              <div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {amenity.title}
                </h3>
                <p
                  className="text-foreground/70 text-sm leading-relaxed"
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
