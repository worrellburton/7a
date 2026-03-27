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

export default function Amenities() {
  return (
    <section
      className="py-20 lg:py-28 bg-warm-bg"
      aria-labelledby="amenities-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">A Boutique Treatment Experience</p>
          <h2
            id="amenities-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
          >
            Your Home Away From Home
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {amenities.map((amenity) => (
            <div
              key={amenity.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {amenity.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  {amenity.title}
                </h3>
                <p
                  className="text-xs text-foreground/50 leading-relaxed"
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
