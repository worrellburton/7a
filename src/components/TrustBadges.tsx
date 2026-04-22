type Badge = {
  name: string;
  abbr: string;
  seal?: { src: string; href: string; width: number; height: number; alt: string };
};

export default function TrustBadges() {
  const badges: Badge[] = [
    {
      name: 'Joint Commission Accredited',
      abbr: 'JCAHO',
      seal: {
        src: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776808204322-pzyzhrow2ib-joint-commission-gold-seal-of-approval.jpg',
        href: 'https://www.qualitycheck.org/',
        width: 120,
        height: 120,
        alt: 'Joint Commission Gold Seal of Approval',
      },
    },
    {
      name: 'LegitScript Certified',
      abbr: 'LegitScript',
      seal: {
        // Official LegitScript-hosted seal keyed to sevenarrowsrecovery.com.
        // LegitScript requires the seal be served from their CDN and linked
        // back to their verification page — do not self-host.
        src: 'https://static.legitscript.com/seals/11087571.png',
        href: 'https://www.legitscript.com/websites/?checker_keywords=sevenarrowsrecovery.com',
        width: 65,
        height: 79,
        alt: 'Verify Approval for www.sevenarrowsrecovery.com',
      },
    },
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
          {badges.map((badge) =>
            badge.seal ? (
              <a
                key={badge.abbr}
                href={badge.seal.href}
                target="_blank"
                rel="noopener noreferrer"
                title={badge.seal.alt}
                className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <img
                  src={badge.seal.src}
                  alt={badge.seal.alt}
                  width={badge.seal.width}
                  height={badge.seal.height}
                  className="h-12 w-auto"
                />
                <span className="text-xs text-foreground/60 hidden sm:block" style={{ fontFamily: 'var(--font-body)' }}>
                  {badge.name}
                </span>
              </a>
            ) : (
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
            )
          )}
        </div>
      </div>
    </section>
  );
}
