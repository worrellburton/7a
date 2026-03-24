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
      loading="lazy"
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

          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={prev}
              disabled={offset === 0}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 transition-opacity text-xl shrink-0"
              aria-label="Previous insurance providers"
            >
              &lsaquo;
            </button>

            <div className="flex items-center justify-center gap-8 lg:gap-12 overflow-hidden">
              {insuranceProviders.slice(offset, offset + visibleCount).map((provider) => (
                <Link
                  key={provider.name}
                  href={provider.href}
                  className="flex-shrink-0 flex items-center justify-center h-12 px-1 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label={provider.name}
                >
                  <InsuranceLogo name={provider.name} domain={provider.domain} />
                </Link>
              ))}
            </div>

            <button
              onClick={next}
              disabled={offset >= maxOffset}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-20 transition-opacity text-xl shrink-0"
              aria-label="Next insurance providers"
            >
              &rsaquo;
            </button>
          </div>

          <Link href="/admissions#verify" className="btn-primary text-xs">
            Verify Insurance
          </Link>
        </div>
      </div>
    </section>
  );
}
