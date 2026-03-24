import { useState } from 'react';
import { Link } from '@remix-run/react';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceProviders = [
  { name: 'UnitedHealthcare', domain: 'uhc.com', href: '/insurance/united-healthcare' },
  { name: 'Aetna', domain: 'aetna.com', href: '/insurance/aetna' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com', href: '/insurance/blue-cross-blue-shield' },
  { name: 'Cigna', domain: 'cigna.com', href: '/insurance/cigna' },
  { name: 'Humana', domain: 'humana.com', href: '/insurance/humana' },
  { name: 'TRICARE', domain: 'tricare.mil', href: '/insurance/tricare' },
  { name: 'Anthem', domain: 'anthem.com', href: '/insurance/aetna' },
  { name: 'Carelon Behavioral Health', domain: 'carelon.com', href: '/admissions' },
  { name: 'ComPsych', domain: 'compsych.com', href: '/admissions' },
];

function InsuranceLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="text-white/80 text-base lg:text-lg font-bold tracking-wide whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/light/h/80/w/200/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={name}
      className="h-7 lg:h-9 w-auto max-w-[160px] object-contain brightness-0 invert"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

export default function InsuranceCarousel() {
  const [offset, setOffset] = useState(0);
  const visibleCount = 5;
  const maxOffset = Math.max(0, insuranceProviders.length - visibleCount);

  const prev = () => setOffset((o) => Math.max(0, o - 1));
  const next = () => setOffset((o) => Math.min(maxOffset, o + 1));

  return (
    <section className="relative" aria-labelledby="insurance-carousel-heading">
      {/* Preload all logo images */}
      {insuranceProviders.map((p) => (
        <link
          key={p.domain}
          rel="preload"
          as="image"
          href={`https://cdn.brandfetch.io/${p.domain}/fallback/404/theme/light/h/80/w/200/logo?c=${BRANDFETCH_CLIENT_ID}`}
        />
      ))}

      <div className="absolute inset-0">
        <img src="/7a/images/sign-night-sky-milky-way.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <div className="relative py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Insurance Can Help Cover the Cost of Treatment
          </p>
          <h2
            id="insurance-carousel-heading"
            className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-10"
          >
            We Work With Most Major Insurance
          </h2>

          <div className="flex items-center justify-center gap-4 lg:gap-6 mb-10">
            {/* Previous button */}
            <button
              onClick={prev}
              disabled={offset === 0}
              className="w-11 h-11 lg:w-12 lg:h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/50 hover:bg-white/10 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300 shrink-0"
              aria-label="Previous insurance providers"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Logo track */}
            <div className="overflow-hidden flex-1 max-w-4xl">
              <div
                className="flex items-center gap-8 lg:gap-12"
                style={{
                  transform: `translateX(-${offset * (100 / visibleCount)}%)`,
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {insuranceProviders.map((provider) => (
                  <Link
                    key={provider.name}
                    to={provider.href}
                    className="flex-shrink-0 flex items-center justify-center h-16 px-2 opacity-70 hover:opacity-100 transition-all duration-300 group"
                    aria-label={provider.name}
                    style={{
                      width: `calc(${100 / visibleCount}% - 32px)`,
                    }}
                  >
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(198, 122, 74, 0.15))',
                      }}
                    >
                      {/* Glow effect behind logo */}
                      <div
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: 'radial-gradient(circle, rgba(198, 122, 74, 0.2) 0%, transparent 70%)',
                          transform: 'scale(2.5)',
                        }}
                      />
                      <div className="relative" style={{ animation: 'logoGlow 3s ease-in-out infinite' }}>
                        <InsuranceLogo name={provider.name} domain={provider.domain} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={next}
              disabled={offset >= maxOffset}
              className="w-11 h-11 lg:w-12 lg:h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/50 hover:bg-white/10 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300 shrink-0"
              aria-label="Next insurance providers"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-10">
            {Array.from({ length: maxOffset + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setOffset(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === offset ? 'bg-accent w-4' : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <Link to="/admissions#verify" className="btn-primary text-xs">
            Verify Insurance
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(198, 122, 74, 0.1)); }
          50% { filter: drop-shadow(0 0 14px rgba(198, 122, 74, 0.3)); }
        }
      `}</style>
    </section>
  );
}
