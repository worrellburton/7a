import Link from 'next/link';

export default function ProgramSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="program-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">Seven Arrows</p>
          <h2
            id="program-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            A Program Unlike the Rest
          </h2>
          <p className="text-foreground/60 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Our individualized approach combines evidence-based, holistic, experiential
            and traditional therapies for a truly transformative healing experience.
          </p>
        </div>

        {/* 3-column card grid — Eden style */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {/* Card 1: Image card */}
          <div className="rounded-2xl overflow-hidden bg-warm-bg">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/images/equine-therapy-portrait.jpg"
                alt="Equine therapy at Seven Arrows"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">Holistic & Experiential</h3>
              <p className="text-foreground/60 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Equine therapy, sound healing, and nature-based practices at the base of the Swisshelm Mountains.
              </p>
            </div>
          </div>

          {/* Card 2: Stats/info card */}
          <div className="rounded-2xl bg-warm-bg p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-3">Clinical Excellence</h3>
              <p className="text-foreground/60 text-sm leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                Evidence-based modalities including CBT, DBT, EMDR, and our proprietary TraumAddiction&trade; approach.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>JCAHO Accredited</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>LegitScript Certified</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>Trauma-Specialized Care</span>
              </div>
            </div>
          </div>

          {/* Card 3: Image card */}
          <div className="rounded-2xl overflow-hidden bg-warm-bg">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="/images/group-sunset-desert.jpg"
                alt="Group gathering at sunset in the Arizona desert"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">Small Group Setting</h3>
              <p className="text-foreground/60 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Boutique treatment with a 6:1 client-to-staff ratio so you&apos;re never just a number.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/our-program" className="btn-outline">
            Explore Our Program
          </Link>
        </div>
      </div>
    </section>
  );
}
