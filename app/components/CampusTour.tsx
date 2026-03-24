import { Link } from '@remix-run/react';

export default function CampusTour() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="campus-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="section-label mb-4">Explore</p>
            <h2
              id="campus-heading"
              className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
            >
              Our Stunning Campus
            </h2>
          </div>
          <div>
            <p
              className="text-foreground/70 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The staff at our Arizona rehab center believe in comprehensive treatment
              of the mind, body, and spirit. Our holistic approach guides clients to
              begin a fresh chapter in their lives.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="/7a/images/facility-exterior-mountains.jpg"
              alt="Facility exterior with mountains"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="/7a/images/covered-porch-desert-view.jpg"
              alt="Covered porch with desert view"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="/7a/images/bedroom-shared.jpg"
              alt="Shared bedroom"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="/7a/images/group-gathering-pavilion.jpg"
              alt="Group gathering under pavilion at dusk"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/tour" className="btn-dark">
            Tour Campus
          </Link>
        </div>
      </div>
    </section>
  );
}
