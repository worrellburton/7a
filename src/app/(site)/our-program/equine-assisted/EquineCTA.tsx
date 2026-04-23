'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Phase 10 — Closing CTA with Arizona-specific GEO signals.
 *
 * Drive-time entries name specific Arizona cities and the airport
 * we pick up from, which is what actually triggers local-intent
 * search queries ("drug rehab near Tucson," "rehab near Phoenix
 * airport," etc.) and gives LLMs a direct, sourceable answer when
 * someone asks "how far is Seven Arrows from Phoenix?"
 */

interface DriveTime {
  from: string;
  distance: string;
  via: string;
}

const driveTimes: DriveTime[] = [
  { from: 'Tucson, AZ', distance: '2h 10m', via: 'I-10 E / US-191 S' },
  { from: 'Phoenix, AZ', distance: '4h 00m', via: 'I-10 E / I-8 E' },
  { from: 'Tucson International Airport (TUS)', distance: '2h 15m', via: 'Primary pickup airport' },
  { from: 'Phoenix Sky Harbor (PHX)', distance: '4h 00m', via: 'Alternate airport' },
  { from: 'El Paso, TX', distance: '3h 15m', via: 'I-10 W' },
  { from: 'Albuquerque, NM', distance: '5h 45m', via: 'I-25 S / I-10 W' },
];

export default function EquineCTA() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ background: 'var(--color-warm-bg)' }}
      aria-labelledby="equine-cta-heading"
    >
      {/* Faint mountain-ridge SVG flourish in the background */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-48 lg:h-64 opacity-[0.07] pointer-events-none"
      >
        <path
          d="M0 400 L0 260 L120 180 L220 230 L360 140 L460 210 L560 120 L680 200 L780 110 L900 180 L1000 90 L1120 170 L1200 130 L1200 400 Z"
          fill="currentColor"
          className="text-primary-dark"
        />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            <p className="section-label mb-5">Ready when you are</p>
            <h2
              id="equine-cta-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.1rem, 4.8vw, 3.25rem)',
                lineHeight: 1,
              }}
            >
              The herd is on the ranch.{' '}
              <em className="not-italic text-primary">Today.</em>
            </h2>
            <p
              className="text-foreground/70 text-[17px] leading-relaxed mb-8 max-w-2xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Admissions at Seven Arrows Recovery runs 24/7. Most clients
              complete a confidential phone assessment, get a benefits check
              back within thirty minutes, and are admitted to our
              Cochise County, Arizona residential ranch within forty-eight
              hours of their first call — EAP included in the plan of care
              from the first week.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a
                href="tel:+18669964308"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                Call (866) 996-4308
              </a>
              <Link
                href="/admissions#verify"
                className="inline-flex items-center justify-center gap-2 border border-foreground/20 text-foreground hover:bg-foreground hover:text-white rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Verify my insurance
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 text-foreground/80 font-semibold hover:text-primary transition-colors text-sm tracking-[0.1em] uppercase"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Send a message
              </Link>
            </div>

            <address
              className="not-italic text-foreground/75 text-[15px] leading-relaxed max-w-xl"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <strong className="block text-foreground font-semibold mb-1">
                Seven Arrows Recovery
              </strong>
              2491 W Jefferson Rd<br />
              Elfrida, Arizona 85610<br />
              <span className="text-foreground/55">
                Cochise County · base of the Swisshelm Mountains
              </span>
            </address>
          </div>

          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.25s',
            }}
          >
            <div className="rounded-3xl bg-white border border-black/5 p-7 lg:p-8 shadow-sm">
              <p
                className="text-[10px] tracking-[0.28em] uppercase font-bold text-primary mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Driving & airports
              </p>
              <ul className="divide-y divide-black/5">
                {driveTimes.map((d) => (
                  <li
                    key={d.from}
                    className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p
                        className="text-foreground font-semibold text-sm"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {d.from}
                      </p>
                      <p
                        className="text-foreground/50 text-[12px]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {d.via}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-foreground tabular-nums font-bold"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      {d.distance}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className="mt-5 text-foreground/55 text-[12px] leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Approximate driving times during normal traffic conditions.
                Admissions arranges pickup from <strong className="text-foreground/80">Tucson International (TUS)</strong> for most clients; long-haul transport from other airports is coordinated case-by-case.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
