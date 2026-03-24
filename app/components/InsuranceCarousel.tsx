

import { useState } from 'react';
import { Link } from '@remix-run/react';

/* ── Insurance Provider Logos (white, for dark background) ─────────── */

function UnitedHealthcareLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="none" stroke="white" strokeWidth="2" />
      <path d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" strokeWidth="2" fill="none" />
      <path d="M14 22c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.5" opacity="0.7" fill="none" />
      <text x="44" y="25" fill="white" fontSize="13" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">UnitedHealthcare</text>
    </svg>
  );
}

function AetnaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8l12 24H4L16 8z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 26h12" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <text x="36" y="26" fill="white" fontSize="16" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" letterSpacing="1">Aetna</text>
    </svg>
  );
}

function BlueCrossLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 260 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cross */}
      <rect x="13" y="6" width="8" height="28" rx="1" fill="#5ba4e6" opacity="0.9" />
      <rect x="6" y="13" width="22" height="14" rx="1" fill="#5ba4e6" opacity="0.9" />
      {/* Shield */}
      <path d="M17 5c-6 0-11 2-11 2v14c0 8 11 14 11 14s11-6 11-14V7s-5-2-11-2z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <text x="38" y="25" fill="white" fontSize="13" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">Blue Cross Blue Shield</text>
    </svg>
  );
}

function CignaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="20" r="12" fill="none" stroke="#ee8a3b" strokeWidth="2.5" />
      <circle cx="16" cy="20" r="6" fill="none" stroke="#3bb1ee" strokeWidth="2" />
      <text x="34" y="26" fill="white" fontSize="16" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" letterSpacing="0.5">Cigna</text>
    </svg>
  );
}

function HumanaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="6" fill="none" stroke="#5ec26a" strokeWidth="2" />
      <path d="M10 24c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#5ec26a" strokeWidth="2" fill="none" />
      <path d="M16 10V6" stroke="#5ec26a" strokeWidth="1.5" />
      <text x="30" y="26" fill="white" fontSize="15" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">Humana</text>
    </svg>
  );
}

function TricareLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28L17 6l11 22H6z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 20h10" stroke="white" strokeWidth="1" opacity="0.5" />
      <circle cx="17" cy="16" r="2" fill="white" opacity="0.6" />
      <text x="34" y="25" fill="white" fontSize="14" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" letterSpacing="1">TRICARE</text>
    </svg>
  );
}

function AnthemLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="20" r="11" fill="none" stroke="#6b7de0" strokeWidth="2" />
      <path d="M10 20h12M16 14v12" stroke="#6b7de0" strokeWidth="1.5" />
      <text x="34" y="26" fill="white" fontSize="15" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">Anthem</text>
    </svg>
  );
}

function CarelonLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="20" r="10" fill="none" stroke="#7bc9a0" strokeWidth="2" />
      <path d="M11 20c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5" stroke="#7bc9a0" strokeWidth="1.5" strokeLinecap="round" />
      <text x="32" y="25" fill="white" fontSize="12" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">Carelon Behavioral Health</text>
    </svg>
  );
}

function ComPsychLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="24" rx="4" fill="none" stroke="#e0a03b" strokeWidth="2" />
      <path d="M10 16h12M10 20h8M10 24h10" stroke="#e0a03b" strokeWidth="1.5" strokeLinecap="round" />
      <text x="34" y="25" fill="white" fontSize="14" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">ComPsych</text>
    </svg>
  );
}

const insuranceProviders = [
  { name: 'UnitedHealthcare', href: '/insurance/united-healthcare', Logo: UnitedHealthcareLogo },
  { name: 'Aetna', href: '/insurance/aetna', Logo: AetnaLogo },
  { name: 'Blue Cross Blue Shield', href: '/insurance/blue-cross-blue-shield', Logo: BlueCrossLogo },
  { name: 'Cigna', href: '/insurance/cigna', Logo: CignaLogo },
  { name: 'Humana', href: '/insurance/humana', Logo: HumanaLogo },
  { name: 'TRICARE', href: '/insurance/tricare', Logo: TricareLogo },
  { name: 'Anthem', href: '/insurance/aetna', Logo: AnthemLogo },
  { name: 'Carelon Behavioral Health', href: '/admissions', Logo: CarelonLogo },
  { name: 'ComPsych', href: '/admissions', Logo: ComPsychLogo },
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

            <div className="flex items-center gap-6 lg:gap-10 overflow-hidden">
              {insuranceProviders.slice(offset, offset + visibleCount).map((provider) => (
                <Link
                  key={provider.name}
                  href={provider.href}
                  className="flex-shrink-0 flex items-center justify-center h-12 lg:h-14 px-2 group opacity-80 hover:opacity-100 transition-opacity"
                  aria-label={provider.name}
                >
                  <provider.Logo className="h-8 lg:h-10 w-auto" />
                </Link>
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
