'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Holistic & Indigenous — Phase 8. Trained practitioners teaser.
 *
 * A short intro that says who holds these practices, with a list of
 * role descriptors (not names — those live on the team page). The
 * argument: this isn't adjunct staff running mat classes, it's
 * credentialed practitioners whose whole career is in the practice.
 * CTA jumps to /who-we-are/meet-our-team.
 */

interface Role {
  title: string;
  credentials: string;
}

const roles: Role[] = [
  {
    title: 'Trauma-informed yoga teacher',
    credentials: 'E-RYT 500 · TCTSY-F · Bay Area lineage',
  },
  {
    title: 'Sound practitioner',
    credentials: 'Crystal bowl certification · 10+ years holding groups',
  },
  {
    title: 'Breathwork facilitator',
    credentials: 'Somatic Experiencing practitioner · pranayama-trained',
  },
  {
    title: 'Art & music therapists',
    credentials: 'ATR-BC · MT-BC · licensed in Arizona',
  },
  {
    title: 'Ceremony carriers',
    credentials: 'Indigenous-led · lineage holders with explicit permission',
  },
  {
    title: 'On-site nutrition',
    credentials: 'Whole-food kitchen team · gut-brain aware',
  },
];

export default function Practitioners() {
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
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="practitioners-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 85% 30%, rgba(216,137,102,0.1) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          {/* Copy + CTA */}
          <div className="lg:col-span-5">
            <p
              className="section-label mb-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              The people holding it
            </p>
            <h2
              id="practitioners-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.2vw, 3rem)',
                lineHeight: 1.04,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
              }}
            >
              Credentialed practitioners, <em className="not-italic text-primary">not adjunct staff</em>.
            </h2>
            <p
              className="text-foreground/75 text-lg leading-relaxed mb-8"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.9s ease 0.35s',
              }}
            >
              Every practice listed on this page is held by someone whose whole
              career is in it &mdash; teachers, therapists, and carriers with
              real training and real lineage. We bring people in. We don&rsquo;t
              ask a counselor to moonlight as a yoga teacher.
            </p>
            <Link
              href="/who-we-are/meet-our-team"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
              style={{
                fontFamily: 'var(--font-body)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s',
              }}
            >
              Meet the team
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Role list */}
          <div className="lg:col-span-7">
            <ul className="divide-y divide-black/10 border-t border-b border-black/10">
              {roles.map((r, i) => (
                <li
                  key={r.title}
                  className="flex items-start sm:items-center justify-between gap-4 py-5 sm:py-6 flex-col sm:flex-row"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(14px)',
                    transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.35 + i * 0.08}s`,
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-[11px] font-semibold"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3
                      className="text-foreground font-semibold truncate"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.2rem',
                      }}
                    >
                      {r.title}
                    </h3>
                  </div>
                  <p
                    className="text-foreground/60 text-[12.5px] tracking-[0.08em] uppercase font-semibold pl-11 sm:pl-0 sm:text-right"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {r.credentials}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
