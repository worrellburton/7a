'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicTeamMember } from '@/lib/team';

/**
 * Two editorial cards side-by-side: a favorite quote (serif pull-
 * quote in an accented card) and a "what they love about Seven
 * Arrows" card (warm-bg editorial). Only renders the cards that
 * have content on the member record; hides the section entirely if
 * neither field is populated.
 */
export default function TeamMemberFavorites({ member }: { member: PublicTeamMember }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hasQuote = Boolean(member.favorite_quote?.trim());
  const hasLove = Boolean(member.favorite_seven_arrows?.trim());
  if (!hasQuote && !hasLove) return null;

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="favorites-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          id="favorites-heading"
          className="section-label mb-10 lg:mb-12"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s' }}
        >
          In {member.full_name.split(' ')[0]}&rsquo;s Own Words
        </p>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-7 items-stretch">
          {hasQuote && (
            <article
              className="rounded-2xl p-8 lg:p-10 text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.15s',
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 55% 55% at 85% 20%, rgba(216,137,102,0.32) 0%, rgba(216,137,102,0) 65%)' }}
              />
              <div className="relative">
                <p
                  className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Favorite Quote
                </p>
                <span
                  aria-hidden="true"
                  className="block text-accent leading-none mb-3"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
                >
                  &ldquo;
                </span>
                <blockquote
                  className="leading-[1.22]"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 1.9vw, 1.7rem)' }}
                >
                  {member.favorite_quote}
                </blockquote>
              </div>
            </article>
          )}

          {hasLove && (
            <article
              className="rounded-2xl p-8 lg:p-10 bg-white border border-black/5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(22px)',
                transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${hasQuote ? '0.25s' : '0.15s'}`,
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Why I Love Seven Arrows
              </p>
              <p
                className="text-foreground leading-relaxed"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.15rem, 1.6vw, 1.45rem)', lineHeight: 1.4 }}
              >
                {member.favorite_seven_arrows}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
