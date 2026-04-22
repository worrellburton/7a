'use client';

import Link from 'next/link';
import type { PublicTeamMember } from '@/lib/team';

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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {team.map((member) => (
        <Link
          key={member.id}
          href={`/who-we-are/meet-our-team/${member.slug}`}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-dark-section shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Read ${member.full_name}'s profile`}
        >
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.full_name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/25 text-7xl font-bold">
              {(member.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Bottom scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)',
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
            <h3
              className="text-white text-xl lg:text-2xl font-bold leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {member.full_name}
            </h3>
            {member.job_title && (
              <p
                className="mt-2 text-white/70 text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {member.job_title}
              </p>
            )}
            <span
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Read profile
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
