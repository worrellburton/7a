import { Link } from '@remix-run/react';
import { useState } from 'react';

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
  const [hovered, setHovered] = useState<string | null>(null);

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

        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6"
          onMouseLeave={() => setHovered(null)}
        >
          {services.map((service) => {
            const isHovered = hovered === service.title;
            const isFaded = hovered !== null && !isHovered;

            return (
              <Link
                key={service.title}
                to={service.href}
                className="group block transition-all duration-500"
                style={{
                  opacity: isFaded ? 0.35 : 1,
                  filter: isFaded ? 'grayscale(0.4)' : 'none',
                }}
                onMouseEnter={() => setHovered(service.title)}
              >
                <div className="relative rounded-lg overflow-hidden aspect-square">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Gradient overlay + title on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span
                      className="text-xs font-semibold tracking-[0.15em] uppercase text-white drop-shadow-lg transition-all duration-500 inline-block"
                      style={{
                        fontFamily: 'var(--font-body)',
                        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      }}
                    >
                      {service.title}
                    </span>
                    <span
                      className="block h-[2px] bg-primary transition-all duration-500 mt-2"
                      style={{
                        width: isHovered ? '3rem' : '1.5rem',
                        opacity: isHovered ? 1 : 0.6,
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
