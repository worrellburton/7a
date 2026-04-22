'use client';

import { useState } from 'react';
import AdmissionsForm from '@/components/AdmissionsForm';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceProviders = [
  { name: 'Aetna', domain: 'aetna.com', href: '/insurance/aetna' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com', href: '/insurance/blue-cross-blue-shield' },
  { name: 'Cigna', domain: 'cigna.com', href: '/insurance/cigna' },
  { name: 'UnitedHealthcare', domain: 'uhc.com', href: '/insurance/united-healthcare' },
  { name: 'Humana', domain: 'humana.com', href: '/insurance/humana' },
  { name: 'TRICARE', domain: 'tricare.mil', href: '/insurance/tricare' },
  { name: 'Anthem', domain: 'anthem.com', href: null },
  { name: 'Carelon Behavioral Health', domain: 'carelon.com', href: null },
  { name: 'ComPsych', domain: 'compsych.com', href: null },
];

function InsuranceLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="text-foreground/70 text-[13px] font-semibold whitespace-nowrap text-center"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/dark/h/40/w/140/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={`${name} logo`}
      className="h-7 w-auto max-w-[130px] object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function InsuranceVerify() {
  return (
    <section
      id="verify"
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="insurance-verify-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <p className="section-label mb-5">Insurance verification</p>
            <h2
              id="insurance-verify-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
              }}
            >
              Free, confidential, <em className="not-italic text-primary">no commitment</em>.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We verify benefits with most major insurance plans and return a
              plain-English summary of your coverage &mdash; deductible,
              copay, authorized days &mdash; usually within 15 to 30 minutes
              during business hours.
            </p>
            <p
              className="text-foreground/70 leading-relaxed mb-10"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Bring your member ID, group number, and date of birth when you
              call. If you don&rsquo;t see your carrier below, call us
              anyway &mdash; we also work with out-of-network PPO plans and
              offer private-pay options.
            </p>

            <p
              className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary mb-5 pb-3 border-b border-primary/25"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              In-network with
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
              {insuranceProviders.map((p) => {
                const body = (
                  <div className="flex items-center justify-center rounded-xl bg-white border border-black/5 px-4 py-4 h-16 transition-shadow hover:shadow-md">
                    <InsuranceLogo name={p.name} domain={p.domain} />
                  </div>
                );
                return p.href ? (
                  <a key={p.name} href={p.href} aria-label={`${p.name} insurance details`} className="block">
                    {body}
                  </a>
                ) : (
                  <div key={p.name}>{body}</div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-white border border-black/5 p-5 lg:p-6 flex items-start gap-4">
              <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 12l2 2 4-4" />
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p
                className="text-foreground/70 text-[14.5px] leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows does not currently accept Medicaid or Medicare as
                primary insurance. For Medicaid/Medicare clients, call us
                anyway &mdash; we maintain a trusted-partner referral list
                and will help you find the right placement.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white border border-black/5 p-6 lg:p-8 shadow-sm">
              <h3
                className="text-foreground font-bold mb-5"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', lineHeight: 1.15 }}
              >
                Verify your insurance
              </h3>
              <AdmissionsForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
