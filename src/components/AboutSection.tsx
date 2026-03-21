import Link from 'next/link';

export default function AboutSection() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="about-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left images */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(135deg, #8b6b4b 0%, #6b4b3b 50%, #4b3b2b 100%)',
                }}
              />
            </div>
            <div className="absolute -bottom-8 right-0 lg:right-8 w-2/3 rounded-2xl overflow-hidden aspect-[4/3] shadow-xl border-4 border-white">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(135deg, #a0c0e0 0%, #80a0c0 30%, #c09060 60%, #a07040 100%)',
                }}
              />
            </div>
          </div>

          {/* Right content */}
          <div className="lg:col-span-6 pt-12 lg:pt-0">
            <p className="section-label mb-4">About Us</p>
            <h2
              id="about-heading"
              className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-6"
            >
              A Boutique Drug Rehab Center in Arizona
            </h2>
            <p className="text-foreground/70 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
              Seven Arrows cultivates a healthy balance between providing the structure you need for sustainable
              recovery and working with you as a unique individual. Your interests and needs are integrated into
              your daily routine, and can be harmonized with existing treatment schedules.
            </p>
            <Link href="/who-we-are" className="btn-dark">
              Who We Are
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
