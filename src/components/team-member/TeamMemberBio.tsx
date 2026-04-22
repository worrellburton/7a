'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

/**
 * Prose bio for a team member. Renders the bio paragraph(s) on white
 * bg with a serif drop-cap on the first paragraph. Respects newlines
 * from the DB source by splitting on double line-breaks into paragraphs.
 *
 * When no bio is on file, shows a short placeholder with a call to
 * meet the team instead of an empty block.
 */
export default function TeamMemberBio({ member }: { member: PublicTeamMember }) {
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

  const bio = (member.bio || '').trim();
  const paragraphs = bio ? bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-white" aria-labelledby="bio-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className="section-label mb-5"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s' }}
        >
          About
        </p>
        <h2
          id="bio-heading"
          className="text-foreground font-bold tracking-tight mb-10"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)',
            lineHeight: 1.05,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          Get to know {member.full_name.split(' ')[0]}.
        </h2>

        {paragraphs.length > 0 ? (
          <div
            className="space-y-6 text-foreground/80 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)', opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.35s' }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-primary first-letter:leading-none first-letter:text-6xl first-letter:font-bold first-letter:pt-1' : ''} style={i === 0 ? { fontFamily: 'var(--font-body)' } : undefined}>
                {p}
              </p>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl bg-warm-bg p-8 lg:p-10"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.35s' }}
          >
            <p className="text-foreground/65 italic leading-relaxed text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              {member.full_name.split(' ')[0]}&rsquo;s full bio is coming soon. In the meantime, our admissions team can tell you more about how they&rsquo;d support your recovery &mdash; call us anytime at <a href="tel:+18669964308" className="text-primary font-semibold underline decoration-primary/40 hover:decoration-primary">(866) 996-4308</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
