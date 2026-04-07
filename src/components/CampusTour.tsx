import Link from 'next/link';

export default function CampusTour() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="campus-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">Explore</p>
          <h2
            id="campus-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            Our Stunning Campus
          </h2>
          <p
            className="text-foreground/60 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Nestled at the base of the Swisshelm Mountains, our facility offers
            a serene environment for mind, body, and spirit healing.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { src: '/images/facility-exterior-mountains.jpg', alt: 'Facility exterior with mountains' },
            { src: '/images/covered-porch-desert-view.jpg', alt: 'Covered porch with desert view' },
            { src: '/images/bedroom-shared.jpg', alt: 'Shared bedroom' },
            { src: '/images/group-gathering-pavilion.jpg', alt: 'Group gathering under pavilion at dusk' },
          ].map((img) => (
            <div key={img.alt} className="rounded-2xl overflow-hidden aspect-[4/3] bg-warm-bg">
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/tour" className="btn-outline">
            Tour Campus
          </Link>
        </div>
      </div>
    </section>
  );
}
