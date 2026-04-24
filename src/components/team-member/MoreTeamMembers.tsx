'use client';

import Link from 'next/link';
import type { PublicTeamMember } from '@/lib/team';
import MemberNavLink from './MemberNavLink';
import { EASE_OUT_QUART, useInView, useReducedMotion } from './motion';

/**
 * "Meet more of the team" strip — up to six sibling tiles at the
 * bottom of a team-member profile page. Same overlay-photo treatment
 * as the main team grid, but smaller and linked back to each member's
 * own detail page so visitors can keep browsing without bouncing to
 * the index.
 *
 * On hover, each tile lifts, the portrait slightly zooms, the name
 * gets an animated underline, and an arrow glyph slides in — all
 * orchestrated on group-hover for a single unified motion.
 */
export default function MoreTeamMembers({
  current,
  siblings,
}: {
  current: PublicTeamMember;
  siblings: PublicTeamMember[];
}) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const show = inView || reduced;

  const others = siblings.filter((m) => m.slug !== current.slug).slice(0, 6);
  if (others.length === 0) return null;

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-white" aria-labelledby="more-team-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 mb-10 lg:mb-14"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.9s ${EASE_OUT_QUART} 0.05s`,
          }}
        >
          <div>
            <p className="section-label mb-4">More of the Team</p>
            <h2
              id="more-team-heading"
              className="text-foreground font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)', lineHeight: 1.05 }}
            >
              Meet the rest of the clinical team.
            </h2>
          </div>
          <Link
            href="/who-we-are/meet-our-team"
            className="group/see inline-flex items-center gap-2 text-primary font-semibold tracking-[0.1em] uppercase text-[12px] pb-1 relative"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span>See the whole team</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover/see:translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 bottom-0 h-px bg-primary origin-left scale-x-100 group-hover/see:scale-x-100 transition-transform"
            />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
          {others.map((m, i) => (
            <MemberNavLink
              key={m.slug}
              href={`/who-we-are/meet-our-team/${m.slug}`}
              ariaLabel={`Read ${m.full_name}'s profile`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-dark-section shadow-sm transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(18px)',
                transition: `opacity 0.85s ${EASE_OUT_QUART} ${0.15 + i * 0.07}s, transform 0.85s ${EASE_OUT_QUART} ${0.15 + i * 0.07}s, box-shadow 0.4s ease`,
                viewTransitionName: `member-avatar-${m.slug}`,
              }}
            >
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatar_url}
                  alt={m.full_name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.08]"
                  loading="lazy"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/25 text-5xl font-bold">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Base vignette gradient. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)' }}
              />
              {/* Warm copper wash that fades in on hover. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(188,107,74,0) 0%, rgba(188,107,74,0.25) 70%, rgba(107,42,20,0.45) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
                <h3
                  className="text-white font-bold leading-tight relative inline-block"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                >
                  <span className="inline-block transition-transform duration-500 group-hover:-translate-y-0.5">
                    {m.full_name}
                  </span>
                  {/* Copper underline sweeps in on hover. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 -bottom-1 h-[2px] bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </h3>
                {m.job_title && (
                  <p
                    className="mt-1.5 text-white/70 text-[10px] font-semibold tracking-[0.18em] uppercase transition-colors duration-300 group-hover:text-white/95"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {m.job_title}
                  </p>
                )}
                {/* Arrow glyph that slides in from the right on hover. */}
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/15 transition-colors duration-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-white translate-x-[-6px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </MemberNavLink>
          ))}
        </div>
      </div>
    </section>
  );
}
