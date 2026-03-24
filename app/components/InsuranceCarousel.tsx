

import { useState } from 'react';
import { Link } from '@remix-run/react';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceProviders = [
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'Anthem', domain: 'anthem.com' },
  { name: 'BlueCross BlueShield', domain: 'bcbs.com' },
  { name: 'Carelon Behavioral Health', domain: 'carelon.com' },
  { name: 'ComPsych', domain: 'compsych.com' },
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

export default function InsuranceCarousel() {
  const [offset, setOffset] = useState(0);
  const visibleCount = 5;
  const maxOffset = Math.max(0, insuranceProviders.length - visibleCount);

  const prev = () => setOffset((o) => Math.max(0, o - 1));
  const next = () => setOffset((o) => Math.min(maxOffset, o + 1));

  return (
    <section className="relative" aria-labelledby="insurance-carousel-heading">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src="/7a/images/sign-night-sky-milky-way.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <div className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Insurance Can Help Cover the Cost of Treatment
          </p>
          <h2
            id="insurance-carousel-heading"
            className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-12"
          >
            We Work With Most Major Insurance
          </h2>

          {/* Carousel */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <button
              onClick={prev}
              disabled={offset === 0}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 transition-opacity text-2xl"
              aria-label="Previous insurance providers"
            >
              &lsaquo;
            </button>

            <div className="flex items-center gap-8 lg:gap-12 overflow-hidden">
              {insuranceProviders.slice(offset, offset + visibleCount).map((provider) => (
                <div
                  key={provider.name}
                  className="flex-shrink-0 flex items-center justify-center h-12 lg:h-14"
                >
                  <img
                    src={`https://cdn.brandfetch.io/${provider.domain}/theme/light/h/56/w/200/logo?c=${BRANDFETCH_CLIENT_ID}`}
                    alt={provider.name}
                    className="h-8 lg:h-10 w-auto object-contain brightness-0 invert opacity-80"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={next}
              disabled={offset >= maxOffset}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 transition-opacity text-2xl"
              aria-label="Next insurance providers"
            >
              &rsaquo;
            </button>
          </div>

          <Link href="/admissions#verify" className="btn-primary">
            Verify Insurance
          </Link>
        </div>
      </div>
    </section>
  );
}
