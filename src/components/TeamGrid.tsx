'use client';

import { useEffect, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

interface TeamGridProps {
  team: PublicTeamMember[];
}

export default function TeamGrid({ team }: TeamGridProps) {
  const [active, setActive] = useState<PublicTeamMember | null>(null);

  // Esc + body-scroll lock while the modal is open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

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
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {team.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setActive(member)}
            className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-dark-section shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

            {/* Bottom scrim so the overlaid caption is always legible
                against whatever is in the photo. Recovery.com-style. */}
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
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-modal-name"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setActive(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row animate-[fadeSlideUp_0.25s_ease-out]">
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-foreground/70 hover:text-foreground flex items-center justify-center shadow-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="sm:w-2/5 bg-warm-bg shrink-0 relative aspect-[4/5] sm:aspect-auto">
              {active.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.avatar_url}
                  alt={active.full_name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-primary/30 text-7xl font-bold">
                  {active.full_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
              <p
                className="section-label mb-2"
                style={{ color: 'var(--color-primary)' }}
              >
                Our Team
              </p>
              <h2
                id="team-modal-name"
                className="text-2xl lg:text-3xl font-bold text-foreground mb-1"
              >
                {active.full_name}
              </h2>
              {active.job_title && (
                <p
                  className="text-primary font-semibold text-sm mb-5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {active.job_title}
                </p>
              )}
              {active.bio ? (
                <div
                  className="text-foreground/75 leading-relaxed whitespace-pre-line"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {active.bio}
                </div>
              ) : (
                <p
                  className="text-foreground/50 italic"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Bio coming soon.
                </p>
              )}

              {active.favorite_quote && (
                <figure className="mt-6 border-l-2 border-primary/40 pl-4 py-1">
                  <svg
                    className="w-6 h-6 text-primary/30 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2H4v2h1a4 4 0 0 0 4-4V9a2 2 0 0 0 0-2zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 1-2 2h-1v2h1a4 4 0 0 0 4-4V9a2 2 0 0 0 0-2z" />
                  </svg>
                  <blockquote
                    className="text-foreground/80 italic leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {active.favorite_quote}
                  </blockquote>
                  <figcaption
                    className="mt-1.5 text-[11px] uppercase tracking-wider text-primary/70 font-semibold"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Favorite quote
                  </figcaption>
                </figure>
              )}

              {active.favorite_seven_arrows && (
                <div className="mt-6 rounded-xl bg-warm-bg/60 p-4">
                  <p
                    className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Favorite thing about Seven Arrows
                  </p>
                  <p
                    className="text-foreground/80 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {active.favorite_seven_arrows}
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="tel:8669964308" className="btn-primary text-center">
                  Call (866) 996-4308
                </a>
                <a
                  href="/contact"
                  className="btn-outline text-center"
                  onClick={() => setActive(null)}
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
