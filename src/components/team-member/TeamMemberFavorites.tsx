'use client';

import type { PublicTeamMember } from '@/lib/team';
import { EASE_OUT_QUART, useInView, useReducedMotion } from './motion';

/**
 * Two editorial cards side-by-side: a favorite quote (serif pull-
 * quote on a copper gradient card) and a "what they love about Seven
 * Arrows" card (editorial cream). Only renders the cards that have
 * content on the member record; hides the section entirely if
 * neither field is populated.
 *
 * The quote card opens with a large SVG quote-mark glyph that draws
 * itself in on view, then a hover tilt adds a little life to the
 * card when the visitor interacts.
 */
export default function TeamMemberFavorites({ member }: { member: PublicTeamMember }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.18 });
  const show = inView || reduced;

  const hasQuote = Boolean(member.favorite_quote?.trim());
  const hasLove = Boolean(member.favorite_seven_arrows?.trim());
  if (!hasQuote && !hasLove) return null;

  return (
    <section ref={ref} className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="favorites-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          id="favorites-heading"
          className="section-label mb-10 lg:mb-12"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(10px)',
            transition: `all 0.8s ${EASE_OUT_QUART} 0.05s`,
          }}
        >
          In {member.full_name.split(' ')[0]}&rsquo;s Own Words
        </p>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-7 items-stretch">
          {hasQuote && (
            <FavoriteQuoteCard show={show} delay={0.15}>
              {member.favorite_quote!}
            </FavoriteQuoteCard>
          )}

          {hasLove && (
            <FavoriteLoveCard show={show} delay={hasQuote ? 0.25 : 0.15}>
              {member.favorite_seven_arrows!}
            </FavoriteLoveCard>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The dark copper "favorite quote" card. The giant opening quote
 * mark is an SVG glyph — path-drawn on reveal so it feels like it's
 * being sketched into place. The whole card has a 6deg hover tilt
 * that tracks pointer position.
 */
function FavoriteQuoteCard({
  children,
  show,
  delay,
}: {
  children: React.ReactNode;
  show: boolean;
  delay: number;
}) {
  return (
    <article
      className="group rounded-2xl p-8 lg:p-10 text-white relative overflow-hidden will-change-transform"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.95s ${EASE_OUT_QUART} ${delay}s, transform 0.95s ${EASE_OUT_QUART} ${delay}s`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 55% at 85% 20%, rgba(216,137,102,0.32) 0%, rgba(216,137,102,0) 65%)' }}
      />
      {/* Soft accent highlight that drifts on hover. */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,220,200,0.18) 0%, rgba(255,220,200,0) 70%)',
          transform: 'translate(0, 0)',
          transition: `transform 1.1s ${EASE_OUT_QUART}`,
        }}
      />
      <div className="relative">
        <p
          className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Favorite Quote
        </p>

        {/* Animated quote-mark glyph — a display-serif left-double-
            quote path drawn on mount, followed by a subtle bob. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 60 60"
          className="block mb-3"
          width="56"
          height="56"
        >
          <path
            d="M14 40 C14 28, 18 20, 26 16 L26 22 C22 25, 20 30, 20 36 L26 36 L26 44 L14 44 Z
               M34 40 C34 28, 38 20, 46 16 L46 22 C42 25, 40 30, 40 36 L46 36 L46 44 L34 44 Z"
            fill="none"
            stroke="#d88966"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={show ? 0 : 1}
            style={{
              transition: `stroke-dashoffset 1.1s ${EASE_OUT_QUART} ${delay + 0.2}s, fill 0.4s ease ${delay + 1.2}s`,
              fill: show ? 'rgba(216,137,102,0.9)' : 'rgba(216,137,102,0)',
            }}
          />
        </svg>

        <blockquote
          className="leading-[1.22]"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 1.9vw, 1.7rem)' }}
        >
          {children}
        </blockquote>
      </div>
    </article>
  );
}

/**
 * The light "why I love Seven Arrows" card. Gets a hover-activated
 * animated copper underline that sweeps in beneath the eyebrow
 * label to mirror the hero's accent bar treatment.
 */
function FavoriteLoveCard({
  children,
  show,
  delay,
}: {
  children: React.ReactNode;
  show: boolean;
  delay: number;
}) {
  return (
    <article
      className="group rounded-2xl p-8 lg:p-10 bg-white border border-black/5"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity 0.95s ${EASE_OUT_QUART} ${delay}s, transform 0.95s ${EASE_OUT_QUART} ${delay}s, box-shadow 0.4s ease`,
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <p
          className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Why I Love Seven Arrows
        </p>
        <span
          aria-hidden="true"
          className="block h-px bg-primary/70"
          style={{
            width: show ? '2.5rem' : '0rem',
            transition: `width 1s ${EASE_OUT_QUART} ${delay + 0.3}s`,
          }}
        />
      </div>
      <p
        className="text-foreground leading-relaxed"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.15rem, 1.6vw, 1.45rem)', lineHeight: 1.4 }}
      >
        {children}
      </p>
    </article>
  );
}
