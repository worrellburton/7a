import { Link } from '@remix-run/react';

export default function Hero() {
  return (
    <section
      className="relative min-h-[600px] lg:min-h-[700px] flex items-center"
      aria-labelledby="hero-heading"
    >
      {/* Background image placeholder - replace with actual image */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(135deg, #e8ddd4 0%, #d4c4b0 30%, #c9b99a 50%, #bfae8e 70%, #d4c4b0 100%)',
          }}
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="section-label mb-6">Drug Rehab in Arizona</p>
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-8"
          >
            A Place to Heal.
          </h1>
          <p className="text-lg lg:text-xl text-foreground/80 leading-relaxed mb-10 max-w-xl" style={{ fontFamily: 'var(--font-body)' }}>
            Find out why Seven Arrows Recovery is considered one of the best drug
            rehabs in Arizona. We provide clinical and residential treatment to ensure
            lasting recovery in a small group setting, nestled at the base of the tranquil
            Swisshelm mountains.
          </p>
          <Link href="/admissions" className="btn-primary text-base">
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
