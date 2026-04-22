'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

/**
 * "Meet more of the team" strip — up to six sibling tiles at the
 * bottom of a team-member profile page. Same overlay-photo treatment
 * as the main team grid, but smaller and linked back to each member's
 * own detail page so visitors can keep browsing without bouncing to
 * the index.
 */
export default function MoreTeamMembers({
  current,
  siblings,
}: {
  current: PublicTeamMember;
  siblings: PublicTeamMember[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const others = siblings.filter((m) => m.slug !== current.slug).slice(0, 6);
  if (others.length === 0) return null;

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-white" aria-labelledby="more-team-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 mb-10 lg:mb-14"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s' }}
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
            className="inline-flex items-center gap-2 text-primary font-semibold border-b border-primary/50 hover:border-primary pb-1 tracking-[0.1em] uppercase text-[12px] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            See the whole team
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
          {others.map((m, i) => (
            <Link
              key={m.slug}
              href={`/who-we-are/meet-our-team/${m.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-dark-section shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.07}s` }}
            >
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={m.full_name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" loading="lazy" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/25 text-5xl font-bold">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
                <h3 className="text-white font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{m.full_name}</h3>
                {m.job_title && (
                  <p className="mt-1.5 text-white/70 text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ fontFamily: 'var(--font-body)' }}>{m.job_title}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
