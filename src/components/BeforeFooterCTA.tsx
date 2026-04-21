import Link from 'next/link';

export default function BeforeFooterCTA() {
  return (
    <section className="bg-primary" aria-labelledby="before-footer-cta-heading">
      <div className="grid lg:grid-cols-2 min-h-[420px]">
        <div className="relative min-h-[260px] lg:min-h-0">
          <img
            src="/images/facility-exterior-mountains.jpg"
            alt="Seven Arrows Recovery at the base of the Swisshelm Mountains"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex items-center px-6 sm:px-10 lg:px-16 py-14 lg:py-20 text-white">
          <div className="max-w-md">
            <p
              className="flex items-center gap-4 text-xs tracking-[0.22em] uppercase font-semibold text-white/90 mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
              We Are Here For You
            </p>
            <h2
              id="before-footer-cta-heading"
              className="text-3xl lg:text-[2.5rem] font-bold leading-[1.1] uppercase tracking-tight mb-6"
            >
              Change Your Life With A Single Call
            </h2>
            <p
              className="text-white/80 leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Get in touch with the caring team at Seven Arrows Recovery today and find out how we
              can help you have a life-changing experience at our center.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="tel:+18669964308"
                className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-3 text-sm font-semibold tracking-wide uppercase text-white hover:bg-white hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                (866) 996-4308
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase text-white/90 hover:text-white transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Contact Us Online →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
