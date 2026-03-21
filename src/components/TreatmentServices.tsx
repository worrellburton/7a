import Link from 'next/link';

const services = [
  {
    title: 'Detoxification',
    href: '/treatment#detox',
    gradient: 'linear-gradient(180deg, #c9a88a 0%, #8b6f50 100%)',
  },
  {
    title: 'Inpatient',
    href: '/treatment#inpatient',
    gradient: 'linear-gradient(180deg, #a08070 0%, #705040 100%)',
  },
  {
    title: 'Dual-Diagnosis',
    href: '/treatment#dual-diagnosis',
    gradient: 'linear-gradient(180deg, #b09080 0%, #706050 100%)',
  },
  {
    title: 'Holistic Therapies',
    href: '/treatment#holistic',
    gradient: 'linear-gradient(180deg, #c0a090 0%, #907060 100%)',
  },
  {
    title: 'Equine Experience',
    href: '/treatment#equine',
    gradient: 'linear-gradient(180deg, #d0b8a0 0%, #a08868 100%)',
  },
  {
    title: 'Evidence-Based',
    href: '/treatment#evidence-based',
    gradient: 'linear-gradient(180deg, #b09878 0%, #806850 100%)',
  },
  {
    title: 'Indigenous',
    href: '/treatment#indigenous',
    gradient: 'linear-gradient(180deg, #90a8b0 0%, #607080 100%)',
  },
  {
    title: 'Aftercare & Alumni',
    href: '/treatment#aftercare',
    gradient: 'linear-gradient(180deg, #a09080 0%, #605040 100%)',
  },
];

export default function TreatmentServices() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="treatment-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="section-label mb-4">Our Treatment Services</p>
          <h2
            id="treatment-heading"
            className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight mb-6"
          >
            Unwind. Restore. Heal.
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Seven Arrows Recovery combines evidence-based modalities with holistic therapy.
            We offer comprehensive services that value the mind, body and spirit and provide
            personalized support that&apos;s tailored to specific and unique needs. We also
            work with local providers to implement a continuum of care necessary for
            lifelong sobriety.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="group block">
              <div className="relative rounded-lg overflow-hidden aspect-[4/5] mb-3">
                <div
                  className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  style={{ background: service.gradient }}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="block w-8 h-[2px] bg-foreground/30" />
                <span
                  className="text-xs font-semibold tracking-[0.15em] uppercase text-foreground"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {service.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
