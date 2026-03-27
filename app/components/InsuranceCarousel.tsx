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
        className="text-white/80 text-sm lg:text-base font-bold tracking-wide whitespace-nowrap"
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
      className="h-7 lg:h-9 w-auto max-w-[140px] object-contain brightness-0 invert"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

export default function InsuranceCarousel() {
  return (
    <section className="relative" aria-labelledby="insurance-carousel-heading">
      <div className="absolute inset-0">
        <img src="/7a/images/sign-night-sky-milky-way.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <div className="relative py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Insurance Can Help Cover the Cost of Treatment
          </p>
          <h2
            id="insurance-carousel-heading"
            className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-12"
          >
            We Work With Most Major Insurance
          </h2>

          {/* Logo grid — 2 rows */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 lg:gap-x-12 gap-y-6 mb-12 max-w-4xl mx-auto">
            {insuranceProviders.map((provider) => (
              <Link
                key={provider.name}
                to={provider.href}
                className="flex items-center justify-center h-12 lg:h-14 px-3 rounded-lg opacity-70 hover:opacity-100 transition-all duration-300 hover:bg-white/5"
                aria-label={provider.name}
              >
                <InsuranceLogo name={provider.name} domain={provider.domain} />
              </Link>
            ))}
          </div>

          <Link to="/admissions#verify" className="btn-primary text-xs">
            Verify Insurance
          </Link>
        </div>
      </div>
    </section>
  );
}
