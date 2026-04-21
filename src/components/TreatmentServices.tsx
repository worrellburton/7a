import Link from 'next/link';

const services = [
  {
    title: 'Residential Inpatient',
    href: '/treatment/residential-inpatient',
    image: '/images/bedroom-shared.jpg',
    description: '30–90 day residential programs',
  },
  {
    title: 'Dual-Diagnosis',
    href: '/what-we-treat/dual-diagnosis',
    image: '/images/individual-therapy-session.jpg',
    description: 'Co-occurring mental health care',
  },
  {
    title: 'Holistic Therapies',
    href: '/our-program/holistic-approaches',
    image: '/images/sound-healing-session.jpg',
    description: 'Sound healing, meditation & more',
  },
  {
    title: 'Equine-Assisted Psychotherapy',
    href: '/our-program/equine-assisted',
    image: '/images/horses-grazing.jpg',
    description: 'EAP for trauma & recovery',
  },
  {
    title: 'Evidence-Based',
    href: '/our-program/evidence-based',
    image: '/images/group-therapy-room.jpg',
    description: 'CBT, DBT, EMDR & proven methods',
  },
  {
    title: 'Indigenous Healing',
    href: '/our-program/indigenous-approach',
    image: '/images/campfire-ceremony-circle.webp',
    description: 'Ancient wisdom traditions',
  },
  {
    title: 'Aftercare & Alumni',
    href: '/treatment/alumni-aftercare',
    image: '/images/group-gathering-pavilion.jpg',
    description: 'Lifelong recovery support',
  },
  {
    title: 'Family Program',
    href: '/our-program/family-program',
    image: '/images/embrace-connection.jpg',
    description: 'Healing the whole family system',
  },
];

export default function TreatmentServices() {
  return (
    <section
      className="py-20 lg:py-28 bg-warm-bg overflow-hidden"
      aria-labelledby="treatment-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">Our Treatment Services</p>
          <h2
            id="treatment-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            Comprehensive Care for Recovery
          </h2>
          <p
            className="text-foreground/60 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Seven Arrows combines evidence-based modalities with holistic therapy,
            offering personalized support tailored to your unique needs.
          </p>
        </div>
      </div>

      {/* Continuously scrolling card row — pause on hover. */}
      <div className="relative group">
        <div className="flex gap-5 animate-ticker-slow group-hover:[animation-play-state:paused] w-max">
          {[...services, ...services].map((service, i) => (
            <Link
              key={`${service.title}-${i}`}
              href={service.href}
              className="shrink-0 w-[240px] sm:w-[280px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group/card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-1 group-hover/card:text-primary transition-colors">
                  {service.title}
                </h3>
                <p
                  className="text-xs text-foreground/50 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
          style={{ background: 'linear-gradient(90deg, var(--color-warm-bg) 0%, rgba(245,240,235,0) 100%)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
          style={{ background: 'linear-gradient(270deg, var(--color-warm-bg) 0%, rgba(245,240,235,0) 100%)' }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
