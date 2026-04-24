'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

/**
 * Editorial hero for an individual team-member profile page. Left
 * side has the portrait in a large rounded frame with a subtle
 * decorative accent ring; right side carries the eyebrow, serif
 * name, job title, and a breadcrumb back to the team grid.
 */
export default function TeamMemberHero({ member }: { member: PublicTeamMember }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative overflow-hidden text-white"
      aria-labelledby="team-member-heading"
      style={{
        marginTop: 'calc(var(--site-header-height, 68px) * -1)',
        background:
          'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 55% at 20% 30%, rgba(216,137,102,0.28) 0%, rgba(216,137,102,0) 60%), radial-gradient(ellipse 50% 50% at 85% 75%, rgba(107,42,20,0.35) 0%, rgba(107,42,20,0) 55%)',
        }}
      />

      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 3rem)' }}
      >
        <div className="min-h-[75vh] lg:min-h-[82vh] pb-16 lg:pb-24 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Portrait */}
          <div
            className="lg:col-span-5 order-1 lg:order-1"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(18px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <div className="relative w-full max-w-[520px] mx-auto">
              {/* Decorative accent ring offset behind */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[32px] bg-accent/35 translate-x-3 translate-y-3"
              />
              <div className="relative rounded-[32px] overflow-hidden bg-white/5 aspect-[4/5] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/25 text-9xl font-bold">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title block */}
          <div
            className="lg:col-span-7 order-2 lg:order-2"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(14px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <nav
              aria-label="Breadcrumb"
              className="mb-7 text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <ol className="flex items-center gap-2 flex-wrap">
                <li>
                  <Link href="/" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Home</Link>
                </li>
                <li className="text-white/40">/</li>
                <li>
                  <Link href="/who-we-are" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Who We Are</Link>
                </li>
                <li className="text-white/40">/</li>
                <li>
                  <Link href="/who-we-are/meet-our-team" className="hover:text-white transition-colors" style={{ color: 'var(--color-accent)' }}>Meet Our Team</Link>
                </li>
                <li className="text-white/40">/</li>
                <li className="text-white/85">{member.full_name}</li>
              </ol>
            </nav>

            <p
              className="flex items-center gap-4 text-[11px] tracking-[0.24em] uppercase font-semibold text-accent mb-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="block w-10 h-px bg-white/70" aria-hidden="true" />
              Our Team
            </p>

            <h1
              id="team-member-heading"
              className="font-bold tracking-tight leading-[1.02] mb-5"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 6vw, 5.2rem)',
              }}
            >
              {member.full_name}
            </h1>

            {member.job_title && (
              <p
                className="text-white/85 text-lg lg:text-xl font-semibold tracking-wide max-w-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {member.job_title}
              </p>
            )}

            {member.hometown && (
              <p
                className="mt-3 inline-flex items-center gap-2 text-white/70 text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-accent"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>From {member.hometown}</span>
              </p>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href="tel:+18669964308"
                className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-7 py-3.5 text-sm font-semibold shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Call (866) 996-4308
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Contact Seven Arrows
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
