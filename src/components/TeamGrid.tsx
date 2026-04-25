'use client';

import type { PublicTeamMember } from '@/lib/team';
import { formatNameWithCredentials } from '@/lib/displayName';
import MemberNavLink from './team-member/MemberNavLink';

interface TeamGridProps {
  team: PublicTeamMember[];
}

/**
 * Public team grid — tiles link to each member's /who-we-are/
 * meet-our-team/[slug] profile page. Overlay treatment matches the
 * recovery.com reference: portrait fills the card, dark scrim hugs
 * the bottom, serif white name + uppercase tracked role caption.
 */
export default function TeamGrid({ team }: TeamGridProps) {
  if (team.length === 0) {
    return (
      <p
        className="text-center text-foreground/50"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Team profiles are being updated. Please check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
      {team.map((member) => (
        <MemberNavLink
          key={member.id}
          href={`/who-we-are/meet-our-team/${member.slug}`}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-dark-section shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          ariaLabel={`Read ${member.full_name}'s profile`}
          style={{ viewTransitionName: `member-avatar-${member.slug}` }}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.full_name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/25 text-5xl sm:text-7xl font-bold">
              {(member.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Bottom scrim — slightly deeper bottom on mobile so the
              smaller name + role copy still reads cleanly. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.45) 45%, rgba(20,10,6,0.92) 100%)',
            }}
          />

          {/* Subtle corner glyph — Seven Arrows medallion silhouette, top-right.
              Animates a soft pulse on hover so the tile feels alive without
              competing with the portrait. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="absolute top-2.5 right-2.5 w-5 h-5 text-white/20 group-hover:text-accent/90 transition-all duration-700 group-hover:scale-110"
          >
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.25" />
            <line x1="16" y1="3" x2="16" y2="29" stroke="currentColor" strokeWidth="1.25" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0" className="group-hover:opacity-100 transition-opacity duration-700" />
          </svg>

          {/* Top-left fade-in accent rule that draws when the tile is
              hovered — subtle "this card is interactive" affordance. */}
          <span
            aria-hidden="true"
            className="absolute top-3 left-3 h-px bg-accent/80 w-0 group-hover:w-10 transition-all duration-500 ease-out"
          />

          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-6">
            <h3
              className="text-white text-[15px] sm:text-lg lg:text-2xl font-bold leading-tight tracking-tight relative inline-block"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatNameWithCredentials(member.full_name, member.credentials)}
              {/* Underline reveal on hover — desktop only so it doesn't
                  flash on mobile tap. */}
              <span
                aria-hidden="true"
                className="absolute left-0 -bottom-1 hidden lg:block h-[2px] w-0 group-hover:w-full bg-accent transition-all duration-500 ease-out"
              />
            </h3>
            {member.job_title && (
              <p
                className="mt-1.5 sm:mt-2 text-white/70 text-[9px] sm:text-[10px] lg:text-[11px] font-semibold tracking-[0.18em] uppercase line-clamp-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {member.job_title}
              </p>
            )}
            <span
              className="mt-2 sm:mt-3 hidden lg:inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Read profile
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </MemberNavLink>
      ))}
    </div>
  );
}
