export default function TrustBadges() {
  const badges = [
    { name: 'Joint Commission Accredited', abbr: 'JCAHO' },
    { name: 'LegitScript Certified', abbr: 'LegitScript' },
    { name: 'CARF Accredited', abbr: 'CARF' },
    { name: 'HIPAA Compliant', abbr: 'HIPAA' },
  ];

  return (
    <section className="py-8 bg-white border-b border-gray-100" aria-label="Accreditations and certifications">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12">
          <span className="text-xs tracking-[0.15em] uppercase text-foreground/30 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            Trusted by
          </span>
          {badges.map((badge) => (
            <div
              key={badge.abbr}
              className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-warm-bg flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary tracking-wide">{badge.abbr}</span>
              </div>
              <span className="text-xs text-foreground/60 hidden sm:block" style={{ fontFamily: 'var(--font-body)' }}>
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
