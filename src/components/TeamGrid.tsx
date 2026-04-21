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
            className="group bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-warm-bg">
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-primary/40 text-6xl font-bold">
                  {(member.full_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {member.full_name}
              </h3>
              {member.job_title && (
                <p
                  className="text-primary/80 font-semibold text-sm mt-1"
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
