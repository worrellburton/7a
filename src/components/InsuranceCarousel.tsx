'use client';

import { useState } from 'react';
import Link from 'next/link';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

// Ordered to roughly match the reference layout: the most recognizable
// national payers lead, regional + behavioral-health networks follow.
const insuranceProviders = [
  { name: 'Optum', domain: 'optum.com', href: '/admissions' },
  { name: 'Anthem', domain: 'anthem.com', href: '/insurance/aetna' },
  { name: 'Aetna', domain: 'aetna.com', href: '/insurance/aetna' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com', href: '/insurance/blue-cross-blue-shield' },
  { name: 'Cigna', domain: 'cigna.com', href: '/insurance/cigna' },
  { name: 'UnitedHealthcare', domain: 'uhc.com', href: '/insurance/united-healthcare' },
  { name: 'Humana', domain: 'humana.com', href: '/insurance/humana' },
  { name: 'TRICARE', domain: 'tricare.mil', href: '/insurance/tricare' },
  { name: 'Magellan Health', domain: 'magellanhealth.com', href: '/admissions' },
  { name: 'Carelon Behavioral Health', domain: 'carelon.com', href: '/admissions' },
  { name: 'ComPsych', domain: 'compsych.com', href: '/admissions' },
];

function InsuranceLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="text-foreground/70 text-sm font-bold tracking-wide whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }
  return (
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/light/h/80/w/240/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={name}
      className="h-10 lg:h-12 w-auto max-w-[170px] object-contain"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

function ProviderItem({ provider }: { provider: (typeof insuranceProviders)[number] }) {
  return (
    <Link
      href={provider.href}
      className="shrink-0 flex flex-col items-center justify-end gap-3 w-[180px] lg:w-[200px] px-4"
      aria-label={provider.name}
    >
      <div className="h-12 lg:h-14 flex items-center justify-center">
        <InsuranceLogo name={provider.name} domain={provider.domain} />
      </div>
      <span
        className="text-foreground/55 text-sm italic"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {provider.name}
      </span>
    </Link>
  );
}

export default function InsuranceCarousel() {
  return (
    <section
      className="py-20 lg:py-24 bg-warm-bg overflow-hidden"
      aria-labelledby="insurance-carousel-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="section-label justify-center mb-5">Get Help With Recovery Costs</p>
        <h2
          id="insurance-carousel-heading"
          className="font-bold tracking-tight text-foreground mb-14 mx-auto max-w-3xl"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4.2vw, 3.25rem)',
            lineHeight: 1.08,
          }}
        >
          We Accept Most Major Insurances
        </h2>
      </div>

      {/* Edge-to-edge marquee. Duplicated track shifted -50% so the loop
          is seamless; pauses on hover so a visitor can read a logo. */}
      <div
        className="relative mb-14"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)',
        }}
      >
        <div className="flex animate-ticker-slow">
          <div className="flex items-end shrink-0">
            {insuranceProviders.map((p) => (
              <ProviderItem key={`a-${p.name}`} provider={p} />
            ))}
          </div>
          <div className="flex items-end shrink-0" aria-hidden="true">
            {insuranceProviders.map((p) => (
              <ProviderItem key={`b-${p.name}`} provider={p} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8">
        <Link href="/admissions#verify" className="btn-primary">
          Verify Insurance
        </Link>
        <a
          href="tel:+18669964308"
          className="inline-flex items-center gap-2.5 text-foreground font-semibold border-b border-foreground/70 pb-1 tracking-[0.12em] uppercase text-[13px] hover:text-primary hover:border-primary transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          Call Our Specialists
        </a>
      </div>
    </section>
  );
}
