'use client';

import { useState } from 'react';
import Link from 'next/link';

const insuranceProviders = [
  'Cigna',
  'Anthem',
  'BlueCross BlueShield',
  'Carelon Behavioral Health',
  'ComPsych',
  'Aetna',
  'UnitedHealthcare',
  'Humana',
  'TRICARE',
];

export default function InsuranceCarousel() {
  const [offset, setOffset] = useState(0);
  const visibleCount = 5;
  const maxOffset = Math.max(0, insuranceProviders.length - visibleCount);

  const prev = () => setOffset((o) => Math.max(0, o - 1));
  const next = () => setOffset((o) => Math.min(maxOffset, o + 1));

  return (
    <section className="relative" aria-labelledby="insurance-carousel-heading">
      {/* Background image placeholder */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(40,30,20,0.85) 0%, rgba(40,30,20,0.9) 100%), linear-gradient(180deg, #4a6040 0%, #3a5030 50%, #2a3820 100%)',
        }}
      />
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
                  key={provider}
                  className="flex-shrink-0 text-white/80 text-sm lg:text-base font-bold tracking-wide whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {provider}
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
