export default function TrustBadges() {
  const badges = [
    { name: 'Joint Commission Accredited', abbr: 'JCAHO' },
    { name: 'LegitScript Certified', abbr: 'LegitScript' },
    { name: 'CARF Accredited', abbr: 'CARF' },
    { name: 'HIPAA Compliant', abbr: 'HIPAA' },
  ];

  return (
    <section className="py-12 bg-warm-bg border-y border-gray-100" aria-label="Accreditations and certifications">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs tracking-[0.2em] uppercase text-foreground/40 font-semibold mb-6" style={{ fontFamily: 'var(--font-body)' }}>
          Accredited &amp; Trusted
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          {badges.map((badge) => (
            <div
              key={badge.abbr}
              className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-primary tracking-wide">{badge.abbr}</span>
              </div>
              <span className="text-[0.65rem] text-foreground/50 text-center max-w-[100px] leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
