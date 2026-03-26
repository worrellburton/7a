import { Link } from '@remix-run/react';

const services = [
  {
    title: 'Detoxification',
    href: '/treatment/detoxification',
    image: '/7a/images/embrace-connection.jpg',
    description: 'Safe, medically supervised detox',
  },
  {
    title: 'Residential Inpatient',
    href: '/treatment/residential-inpatient',
    image: '/7a/images/bedroom-shared.jpg',
    description: '30–90 day residential programs',
  },
  {
    title: 'Dual-Diagnosis',
    href: '/what-we-treat/dual-diagnosis',
    image: '/7a/images/individual-therapy-session.jpg',
    description: 'Co-occurring mental health care',
  },
  {
    title: 'Holistic Therapies',
    href: '/our-program/holistic-approaches',
    image: '/7a/images/sound-healing-session.jpg',
    description: 'Sound healing, meditation & more',
  },
  {
    title: 'Equine-Assisted Psychotherapy',
    href: '/our-program/equine-assisted',
    image: '/7a/images/horses-grazing.jpg',
    description: 'EAP for trauma & recovery',
  },
  {
    title: 'Evidence-Based',
    href: '/our-program/evidence-based',
    image: '/7a/images/group-therapy-room.jpg',
    description: 'CBT, DBT, EMDR & proven methods',
  },
  {
    title: 'Indigenous Healing',
    href: '/our-program/indigenous-approach',
    image: '/7a/images/campfire-ceremony-circle.webp',
    description: 'Ancient wisdom traditions',
  },
  {
    title: 'Aftercare & Alumni',
    href: '/treatment/alumni-aftercare',
    image: '/7a/images/group-gathering-pavilion.jpg',
    description: 'Lifelong recovery support',
  },
];

export default function TreatmentServices() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="treatment-heading">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
          {services.map((service) => (
            <Link
              key={service.title}
              to={service.href}
              className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
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
      </div>
    </section>
  );
}
