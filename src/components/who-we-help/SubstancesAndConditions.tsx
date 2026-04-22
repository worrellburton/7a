'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 4. Substances & co-occurring conditions.
 *
 * Two parallel columns: substances we treat (with internal links into
 * the /what-we-treat/* hub for link-juice) and co-occurring mental
 * health conditions (dual-diagnosis scope). Both lists use specific
 * named conditions — the words people actually search for (fentanyl,
 * xanax, meth) and the ICD categories clinicians assess (MDD, GAD,
 * PTSD). Internal links boost SEO; named entities help LLMs map
 * queries to the page.
 */

interface SubstanceLink {
  label: string;
  href: string;
}

const substances: SubstanceLink[] = [
  { label: 'Alcohol use disorder', href: '/what-we-treat/alcohol-addiction' },
  { label: 'Opioids (incl. fentanyl)', href: '/what-we-treat/opioid-addiction' },
  { label: 'Heroin', href: '/what-we-treat/heroin-addiction' },
  { label: 'Prescription painkillers', href: '/what-we-treat/prescription-drug-addiction' },
  { label: 'Methamphetamine', href: '/what-we-treat/methamphetamine' },
  { label: 'Cocaine & crack', href: '/what-we-treat/cocaine' },
  { label: 'Benzodiazepines (Xanax, Klonopin)', href: '/what-we-treat/benzodiazepine' },
  { label: 'Ketamine', href: '/what-we-treat/ketamine' },
  { label: 'Inhalants', href: '/what-we-treat/inhalants' },
  { label: 'Marijuana / cannabis use disorder', href: '/what-we-treat/marijuana-addiction' },
  { label: 'Polysubstance use', href: '/what-we-treat' },
];

const conditions: string[] = [
  'Post-traumatic stress disorder (PTSD) & complex trauma',
  'Major depressive disorder (MDD)',
  'Generalized anxiety disorder (GAD) & panic disorder',
  'Bipolar II disorder (stabilized)',
  'Obsessive-compulsive disorder (OCD)',
  'ADHD — inattentive and combined type',
  'Grief, moral injury, and stress-related conditions',
  'Process addictions (gambling, compulsive sexual behavior)',
];

export default function SubstancesAndConditions() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="substances-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What we treat</p>
          <h2
            id="substances-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Substances and what comes <em className="not-italic text-primary">with</em> them.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We treat substance use disorders and the mental-health conditions
            that almost always travel alongside them. Our dual-diagnosis program
            holds both sides of the case at once.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Substances */}
          <div
            className="rounded-2xl bg-white border border-black/5 p-8 lg:p-10 shadow-sm"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Substances
            </p>
            <h3
              className="text-foreground font-bold mb-6"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}
            >
              Eleven classes of substance use we treat
            </h3>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {substances.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="group flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors py-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-3.5 h-3.5 text-primary/60 shrink-0 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[15px] leading-snug">{s.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Conditions */}
          <div
            className="rounded-2xl p-8 lg:p-10 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(140deg, var(--color-dark-section) 0%, var(--color-primary-dark) 100%)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 55% 55% at 85% 15%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 65%)',
              }}
            />
            <div className="relative">
              <p
                className="text-[11px] font-semibold tracking-[0.24em] uppercase text-accent mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Co-occurring conditions
              </p>
              <h3
                className="font-bold mb-6"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.1 }}
              >
                Dual-diagnosis conditions we hold alongside substance use
              </h3>
              <ul className="space-y-3">
                {conditions.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-3 text-white/85 text-[15px] leading-snug"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-4 h-4 text-accent shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/what-we-treat/dual-diagnosis"
                className="inline-flex items-center gap-2 mt-8 text-accent font-semibold border-b border-accent/40 pb-1 tracking-[0.1em] uppercase text-[11px] hover:text-white hover:border-white transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Read about our dual-diagnosis program
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
