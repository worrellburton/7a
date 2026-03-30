import { Link } from '@remix-run/react';

export default function AboutSection() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="about-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Image stack */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-white shadow-sm">
              <img
                src="/images/common-area-living-room.jpg"
                alt="Interior common area with couches"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 right-4 lg:right-8 w-1/2 rounded-2xl overflow-hidden aspect-[4/3] shadow-xl border-4 border-white">
              <img
                src="/images/group-sunset-desert.jpg"
                alt="Group watching sunset in the desert"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Right: Content */}
          <div className="pt-8 lg:pt-0">
            <p className="section-label mb-4">About Us</p>
            <h2
              id="about-heading"
              className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-6"
            >
              A Boutique Drug Rehab Center in Arizona
            </h2>
            <p className="text-foreground/60 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              Seven Arrows cultivates a healthy balance between providing the structure you need for sustainable
              recovery and working with you as a unique individual. Your interests and needs are integrated into
              your daily routine, and can be harmonized with existing treatment schedules.
            </p>
            <Link to="/who-we-are" className="btn-outline">
              Who We Are
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
