import Link from 'next/link';

// Homepage treatment-services grid. Mirrors the 'Our Program' header
// dropdown so clicks from either surface land on the same set of
// pages (dropdown has 9; we drop the lowest-traffic one — Interventions
// — to fit the homepage's 4×2 tile grid). Labels match the dropdown
// exactly so the two surfaces feel like one site, not two.
const services = [
  // Levels of care
  {
    title: 'Residential Inpatient',
    href: '/treatment/residential-inpatient',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776855988197-mah7icy291-twin-beds-southwest-guest-room.jpg',
    description: '30–90 day residential programs',
  },
  {
    title: 'Alumni & Aftercare',
    href: '/treatment/alumni-aftercare',
    image: '/images/group-sunset-desert.jpg',
    description: 'Lifelong recovery support',
  },
  // Clinical approach
  {
    title: 'Trauma Treatment',
    href: '/our-program/trauma-treatment',
    image: '/images/equine-therapy-portrait.jpg',
    description: 'TraumAddiction™ — addressing root causes',
  },
  {
    title: 'Evidence-Based Treatment',
    href: '/our-program/evidence-based',
    image: '/images/common-area-living-room.jpg',
    description: 'CBT · DBT · EMDR · ART · IFS',
  },
  {
    title: 'Holistic & Indigenous',
    href: '/our-program/holistic-approaches',
    image: '/images/sound-healing-session.jpg',
    description: 'Yoga, sweat lodge, sound, ceremony',
  },
  {
    title: 'Equine-Assisted Psychotherapy',
    href: '/our-program/equine-assisted',
    image: '/images/horses-grazing.jpg',
    description: 'EAP for trauma & recovery',
  },
  // Whole person
  {
    title: 'Family Program',
    href: '/our-program/family-program',
    image: '/images/embrace-connection.jpg',
    description: 'Healing the whole family system',
  },
  {
    title: 'Who We Help',
    href: '/our-program/who-we-help',
    image: '/images/group-gathering-pavilion.jpg',
    description: 'Adults 18+ seeking lasting recovery',
  },
];

export default function TreatmentServices() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="treatment-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">Our Program</p>
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
              href={service.href}
              className="group relative block aspect-[4/5] rounded-2xl overflow-hidden shadow-sm bg-foreground/80"
            >
              {/* Background image — slow Ken-Burns zoom on hover. */}
              <img
                src={service.image}
                alt={service.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />

              {/* Always-on scrim so the resting title stays legible. */}
              <div
                className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
                aria-hidden="true"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0) 35%, rgba(20,10,6,0.55) 70%, rgba(20,10,6,0.92) 100%)',
                }}
              />

              {/* Hover-only brand wash so the title gets an accent tint. */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-multiply"
                aria-hidden="true"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(188,107,74,0.0) 0%, rgba(188,107,74,0.35) 55%, rgba(107,42,20,0.85) 100%)',
                }}
              />

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5 text-white">
                <h3
                  className="relative inline-block text-base lg:text-lg font-bold leading-tight transition-transform duration-500 ease-out group-hover:-translate-y-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {service.title}
                  {/* Underline sweep on hover. */}
                  <span
                    className="absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-white/90 transition-transform duration-500 ease-out group-hover:scale-x-100"
                    aria-hidden="true"
                  />
                </h3>
                <p
                  className="text-[12px] lg:text-xs text-white/0 group-hover:text-white/85 max-h-0 group-hover:max-h-16 opacity-0 group-hover:opacity-100 mt-0 group-hover:mt-2 transition-all duration-500 ease-out leading-snug overflow-hidden"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {service.description}
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-500 ease-out"
                  style={{ fontFamily: 'var(--font-body)' }}
                  aria-hidden="true"
                >
                  Learn more
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
