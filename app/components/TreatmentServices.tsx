import { Link } from '@remix-run/react';

const services = [
  {
    title: 'Detoxification',
    href: '/treatment#detox',
    image: '/7a/images/embrace-connection.jpg',
  },
  {
    title: 'Inpatient',
    href: '/treatment#inpatient',
    image: '/7a/images/bedroom-shared.jpg',
  },
  {
    title: 'Dual-Diagnosis',
    href: '/treatment#dual-diagnosis',
    image: '/7a/images/individual-therapy-session.jpg',
  },
  {
    title: 'Holistic Therapies',
    href: '/treatment#holistic',
    image: '/7a/images/sound-healing-session.jpg',
  },
  {
    title: 'Equine Experience',
    href: '/treatment#equine',
    image: '/7a/images/horses-grazing.jpg',
  },
  {
    title: 'Evidence-Based',
    href: '/treatment#evidence-based',
    image: '/7a/images/group-therapy-room.jpg',
  },
  {
    title: 'Indigenous',
    href: '/treatment#indigenous',
    image: '/7a/images/campfire-ceremony-circle.webp',
  },
  {
    title: 'Aftercare & Alumni',
    href: '/treatment#aftercare',
    image: '/7a/images/group-gathering-pavilion.jpg',
  },
];

export default function TreatmentServices() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="treatment-heading">
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
            <Link key={service.title} to={service.href} className="group block">
              <div className="relative rounded-lg overflow-hidden aspect-[4/5] mb-3">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
