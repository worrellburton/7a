'use client';

import { useEffect, useState } from 'react';
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

function InsuranceLogo({
  name,
  domain,
  compact = false,
}: {
  name: string;
  domain: string;
  /** When true, sizes for cramped mobile grid cells (smaller logo,
   *  wrapping wordmark fallback so long brand names like
   *  "Blue Cross Blue Shield" don't blow past the cell width). */
  compact?: boolean;
}) {
  // Pre-validate the logo in-memory before we render any <img>. Keeps the
  // browser's native "broken image" icon from flashing when Brandfetch
  // 404s (which we saw on BCBS / Humana / TRICARE / Magellan), and lets
  // us cleanly swap in a typeset wordmark when the CDN has nothing.
  const src = `https://cdn.brandfetch.io/${domain}/fallback/404/w/240/h/80/logo?c=${BRANDFETCH_CLIENT_ID}`;
  const [status, setStatus] = useState<'loading' | 'ok' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setStatus('ok');
    };
    probe.onerror = () => {
      if (!cancelled) setStatus('failed');
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (status !== 'ok') {
    // Typeset wordmark fallback — reads cleanly as a "logo" in its own
    // right, matches the serif tone of the section heading, and never
    // flickers a broken-image icon. In compact mode we drop the
    // whitespace-nowrap and shrink the type so long brand names wrap
    // inside their cell instead of overflowing.
    return (
      <span
        className={
          compact
            ? 'block text-foreground/80 font-bold tracking-tight text-[13px] leading-tight text-center max-w-full'
            : 'whitespace-nowrap text-foreground/80 font-bold tracking-tight text-xl lg:text-2xl'
        }
        style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
        aria-label={name}
      >
        {name}
      </span>
    );
  }

  // Force a uniform dark monochrome silhouette so a dozen payer logos
  // drawn from a dozen brand systems read as one coherent row. Matches
  // the reference recovery-site treatment.
  return (
    <img
      src={src}
      alt={name}
      className={
        compact
          ? 'h-7 w-auto max-w-full object-contain'
          : 'h-10 lg:h-12 w-auto max-w-[170px] object-contain'
      }
      style={{ filter: 'brightness(0) saturate(100%) opacity(0.78)' }}
      loading="eager"
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

      {/* Mobile: static 2-col grid so long brand names ("Blue Cross
          Blue Shield", "Carelon Behavioral Health") have enough room
          to render without overflowing. Each cell is overflow-hidden
          + min-w-0 so even an oversized logo gets clipped to the cell
          rather than stretching the row. */}
      <div className="lg:hidden max-w-md mx-auto px-4 sm:px-6 mb-10">
        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          {insuranceProviders.map((p) => (
            <Link
              key={p.name}
              href={p.href}
              aria-label={p.name}
              className="flex flex-col items-center justify-end gap-2 min-w-0 overflow-hidden px-2"
            >
              <div className="h-8 w-full flex items-center justify-center overflow-hidden">
                <InsuranceLogo name={p.name} domain={p.domain} compact />
              </div>
              <span
                className="text-foreground/55 text-[11px] italic text-center leading-tight max-w-full truncate px-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: edge-to-edge marquee. Duplicated track shifted -50% so
          the loop is seamless. */}
      <div
        className="hidden lg:block relative mb-14"
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
