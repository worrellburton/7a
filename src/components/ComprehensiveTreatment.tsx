import Link from 'next/link';

// Comprehensive treatment list — sits below the "Our Addiction
// Treatment Programs" overview on the homepage and links into
// each /what-we-treat/<slug> deep page. Pulled out as its own
// component so the homepage layout stays a tidy stack of named
// sections; the list itself is short enough to keep inline rather
// than fetching from a data file.
const TREATMENTS = [
  { label: 'Alcohol Addiction',          href: '/what-we-treat/alcohol-addiction' },
  { label: 'Benzodiazepine Addiction',   href: '/what-we-treat/benzodiazepine' },
  { label: 'Cocaine Addiction',          href: '/what-we-treat/cocaine' },
  { label: 'Heroin Addiction',           href: '/what-we-treat/heroin-addiction' },
  { label: 'Inhalant Addiction',         href: '/what-we-treat/inhalants' },
  { label: 'Ketamine Addiction',         href: '/what-we-treat/ketamine' },
  { label: 'Marijuana Addiction',        href: '/what-we-treat/marijuana-addiction' },
  { label: 'Methamphetamine Addiction',  href: '/what-we-treat/methamphetamine' },
  { label: 'Opioid Addiction',           href: '/what-we-treat/opioid-addiction' },
  { label: 'Prescription Drug Addiction',href: '/what-we-treat/prescription-drug-addiction' },
  { label: 'Dual Diagnosis',             href: '/what-we-treat/dual-diagnosis' },
];

export default function ComprehensiveTreatment() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="comprehensive-treatment-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2
            id="comprehensive-treatment-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight"
          >
            Comprehensive Treatment for Long-Term Recovery
          </h2>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {TREATMENTS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="group flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-warm-bg/60 px-5 py-4 hover:bg-warm-bg hover:border-primary/40 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="text-foreground font-semibold text-[15px]">{t.label}</span>
                <span
                  aria-hidden
                  className="text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
