'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Who We Help — Phase 7. Geographic reach.
 *
 * A map-less but geography-rich section: four AZ metros as primary
 * link tiles (internal link juice to the /locations/* hub), a
 * "neighboring regions" paragraph covering NM/NV/CA/TX, and a final
 * note on out-of-state travel support (airport, flight logistics).
 * Heavy on local SEO keywords and GEO cues.
 */

interface LocalLink {
  city: string;
  region: string;
  drive: string;
  href: string;
}

const cities: LocalLink[] = [
  {
    city: 'Phoenix',
    region: 'Maricopa County',
    drive: '≈ 3 hr from the ranch',
    href: '/locations/phoenix',
  },
  {
    city: 'Tucson',
    region: 'Pima County',
    drive: '≈ 1 hr 45 min from the ranch',
    href: '/locations/tucson',
  },
  {
    city: 'Scottsdale',
    region: 'Maricopa County',
    drive: '≈ 3 hr from the ranch',
    href: '/locations/scottsdale',
  },
  {
    city: 'Mesa',
    region: 'Maricopa County',
    drive: '≈ 3 hr from the ranch',
    href: '/locations/mesa',
  },
];

export default function GeographicReach() {
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
      aria-labelledby="geo-reach-heading"
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
          <p className="section-label mb-5">Where our clients come from</p>
          <h2
            id="geo-reach-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Arizona&rsquo;s only <em className="not-italic text-primary">160-acre ranch rehab</em> &mdash; open to the country.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our campus sits in Cochise County in the southeastern corner of
            Arizona, at the base of the Swisshelm Mountains. We serve clients
            traveling in from across Arizona, the broader Southwest, and
            nationwide &mdash; admissions will handle travel logistics, airport
            pickup, and timing.
          </p>
        </div>

        {/* Arizona cities */}
        <div className="mb-12 lg:mb-14">
          <p
            className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Primary Arizona metros
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {cities.map((c, i) => (
              <Link
                key={c.city}
                href={c.href}
                className="group relative rounded-2xl bg-white border border-black/5 p-6 lg:p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
                }}
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.24em] uppercase text-primary/80 mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.region}
                </p>
                <h3
                  className="text-foreground font-bold mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', lineHeight: 1.1 }}
                >
                  {c.city}
                </h3>
                <p
                  className="text-foreground/60 text-[13.5px] mb-5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.drive}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 text-primary font-semibold tracking-[0.12em] uppercase text-[11px] group-hover:gap-2 transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Local details
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                    <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Neighboring + nationwide */}
        <div
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 1s ease 0.55s',
          }}
        >
          <div className="rounded-2xl bg-white border border-black/5 p-7 lg:p-8">
            <p
              className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Neighboring regions
            </p>
            <h3
              className="text-foreground font-bold mb-3"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.1 }}
            >
              Southwest &amp; the Sun Belt
            </h3>
            <p
              className="text-foreground/70 leading-relaxed text-[15px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We regularly serve clients from Albuquerque and Santa Fe (New
              Mexico), Las Vegas and Henderson (Nevada), Los Angeles and San
              Diego (California), and El Paso and Austin (Texas). Direct flights
              into Tucson or Phoenix Sky Harbor make Arizona treatment practical
              from across the Southwest.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-black/5 p-7 lg:p-8">
            <p
              className="text-[11px] font-semibold tracking-[0.24em] uppercase text-primary mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Nationwide clients
            </p>
            <h3
              className="text-foreground font-bold mb-3"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.1 }}
            >
              Travel support from any state
            </h3>
            <p
              className="text-foreground/70 leading-relaxed text-[15px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Many clients fly in from the Northeast, Pacific Northwest, and
              Midwest. Admissions helps coordinate flights, airport pickup at
              Tucson International (TUS), and any documentation you need from
              a referring clinician or monitoring program.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
